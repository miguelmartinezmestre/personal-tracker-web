#!/usr/bin/env node

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import {
    buildUrl,
    fetchWithTimeout,
    isListening,
    type LongRunningProcess,
    overlayEnv,
    startProcess,
    stopProcess,
} from './lib/command';
import {
    isNodeSupportedByLocalBackend,
    UNSUPPORTED_NODE_MESSAGE,
} from './lib/convex-local-backend';
import {
    bootstrapConvexCredentials,
    buildConvexCommandEnv,
    configureConvexEnv,
    configureConvexEnvAtOnce,
    createDockerComposeHelpers,
    deployConvexFunctions,
    generateAuthSecrets,
    readLocalStackCredentials,
    waitForConvexBackend,
    writeLocalStackCredentials,
} from './lib/convex-stack';

const COMPOSE_FILE = 'infrastructure/docker-compose.yml';

const GENERATED_DIRECTORIES = [
    join('infrastructure', 'mysql-data'),
    join('infrastructure', 'data'),
] as const;

const CLI_LOCAL_DEPLOYMENT_DIRECTORY = join('.convex', 'local', 'default');

const CONVEX_PORT = process.env.CONVEX_PORT ?? process.env.PORT ?? '3210';
const CONVEX_SITE_PORT = process.env.CONVEX_SITE_PORT ?? process.env.SITE_PROXY_PORT ?? '3211';
const DASHBOARD_PORT = process.env.CONVEX_DASHBOARD_PORT ?? process.env.DASHBOARD_PORT ?? '6791';

const MAILDEV_SMTP_PORT = process.env.MAILDEV_SMTP_PORT ?? '1025';
const MAILDEV_WEB_PORT = process.env.MAILDEV_WEB_PORT ?? '1080';
const CONVEX_URL = process.env.CONVEX_SELF_HOSTED_URL ?? `http://127.0.0.1:${CONVEX_PORT}`;

const CONVEX_SITE_URL =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? `http://127.0.0.1:${CONVEX_SITE_PORT}`;

const APP_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000';

const { values: flags } = parseArgs({
    // pnpm may insert a bare `--` before arguments passed to the script.
    args: process.argv.slice(2).filter(arg => arg !== '--'),
    options: {
        reset: { type: 'boolean', default: false },
        confirm: { type: 'boolean', default: false },
        stop: { type: 'boolean', default: false },
        'no-docker': { type: 'boolean', default: false },
    },
});

const { reset: RESET, stop: STOP, 'no-docker': NO_DOCKER } = flags;

// Inherited by every command below, it would send `convex` to a cloud deployment instead.
delete process.env.CONVEX_DEPLOY_KEY;

if (RESET && STOP) {
    throw new Error('Choose stop or reset, not both');
}

if (RESET && !flags.confirm) throw new Error('Reset requires --confirm');

const storedCredentials = readLocalStackCredentials(process.cwd());
const savedCredentials = RESET ? undefined : storedCredentials;

const MYSQL_ROOT_PASSWORD =
    savedCredentials?.mysqlRootPassword ??
    process.env.MYSQL_ROOT_PASSWORD ??
    randomBytes(24).toString('base64url');

function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return overlayEnv({
        PORT: CONVEX_PORT,
        SITE_PROXY_PORT: CONVEX_SITE_PORT,
        DASHBOARD_PORT,
        MAILDEV_SMTP_PORT,
        MAILDEV_WEB_PORT,
        CONVEX_CLOUD_ORIGIN: CONVEX_URL,
        CONVEX_SITE_ORIGIN: CONVEX_SITE_URL,
        NEXT_PUBLIC_DEPLOYMENT_URL: CONVEX_URL,
        MYSQL_ROOT_PASSWORD,
        DATABASE_URL: `mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/convex_self_hosted`,
        MYSQL_URL: `mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306`,
        ...extraEnv,
    });
}

const { dockerCompose, dockerComposeCapture } = createDockerComposeHelpers({
    composeFile: COMPOSE_FILE,
    getComposeEnv,
});

function cleanupGeneratedDirectories(relativePaths: ReadonlyArray<string>): void {
    const workspaceRoot = resolve(process.cwd());

    for (const relativePath of relativePaths) {
        const directoryPath = resolve(workspaceRoot, relativePath);

        if (!directoryPath.startsWith(`${workspaceRoot}${sep}`)) {
            throw new Error('Refusing to delete a path outside the workspace');
        }

        if (!existsSync(directoryPath)) {
            continue;
        }

        rmSync(directoryPath, { recursive: true, force: true });
        console.log(`Removed generated directory: ${directoryPath}`);
    }
}

function upsertEnvFile(
    filePath: string,
    updates: Record<string, string>,
    removedKeys: ReadonlyArray<string> = []
): void {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    const newline = existing.includes('\r\n') ? '\r\n' : '\n';
    const lines = existing.length > 0 ? existing.replace(/\r?\n$/, '').split(/\r?\n/) : [];
    const seenKeys = new Set<string>();

    const isKeyLine = (line: string, key: string) => {
        const normalized = line.trimStart().replace(/^export\s+/, '');

        return (
            normalized.startsWith(key) && normalized.slice(key.length).trimStart().startsWith('=')
        );
    };

    const updatedLines = lines
        .filter(line => !removedKeys.some(key => isKeyLine(line, key)))
        .map(line => {
            for (const [key, value] of Object.entries(updates)) {
                if (!isKeyLine(line, key)) {
                    continue;
                }

                seenKeys.add(key);

                return `${key}=${value}`;
            }

            return line;
        });

    for (const [key, value] of Object.entries(updates)) {
        if (seenKeys.has(key)) {
            continue;
        }

        updatedLines.push(`${key}=${value}`);
    }

    writeFileSync(filePath, `${updatedLines.join(newline)}${newline}`);
}

async function main(): Promise<void> {
    if (STOP) {
        await dockerCompose(['down', '--remove-orphans']);

        return;
    }

    getComposeEnv();

    if (RESET) {
        console.log('Resetting the local development database...');
        await dockerCompose(['down', '-v', '--remove-orphans']);
        cleanupGeneratedDirectories(GENERATED_DIRECTORIES);
    } else if (
        !savedCredentials?.mysqlRootPassword &&
        !process.env.MYSQL_ROOT_PASSWORD &&
        existsSync(join(process.cwd(), 'infrastructure', 'mysql-data'))
    ) {
        throw new Error(
            'Existing local data requires its MYSQL_ROOT_PASSWORD before adopting persistent credentials'
        );
    }

    writeLocalStackCredentials(process.cwd(), {
        ...savedCredentials,
        mysqlRootPassword: MYSQL_ROOT_PASSWORD,
    });

    console.log('Starting local Convex backend docker compose services...');
    console.log(`  - Convex backend: ${CONVEX_URL}`);
    console.log(`  - Convex site: ${CONVEX_SITE_URL}`);
    console.log(`  - Convex dashboard: http://127.0.0.1:${DASHBOARD_PORT}`);
    console.log(`  - MailDev UI: http://127.0.0.1:${MAILDEV_WEB_PORT}`);
    console.log(`  - App origin for auth: ${APP_URL}`);
    await dockerCompose(['up', '-d', 'mysql', 'backend']);

    console.log('Waiting for Convex backend readiness...');
    await waitForConvexBackend(CONVEX_URL);

    console.log('Starting local Convex dashboard...');
    await dockerCompose(['up', '-d', 'dashboard']);

    console.log('Generating Convex self-hosted admin key...');

    const { adminKey, betterAuthSecret, jwks } = await bootstrapConvexCredentials(
        dockerComposeCapture,
        savedCredentials
    );

    writeLocalStackCredentials(process.cwd(), {
        mysqlRootPassword: MYSQL_ROOT_PASSWORD,
        betterAuthSecret,
        jwks,
    });

    const commandEnv = buildConvexCommandEnv({
        deployment: { kind: 'self-hosted', adminKey },
        betterAuthSecret,
        jwks,
        convexUrl: CONVEX_URL,
        convexSiteUrl: CONVEX_SITE_URL,
        siteUrl: APP_URL,
    });

    console.log('Configuring Convex env vars...');
    await configureConvexEnv(commandEnv, APP_URL, {
        setupSecret: process.env.SETUP_SECRET,
    });

    console.log('Deploying Convex functions...');
    await deployConvexFunctions(commandEnv);

    upsertEnvFile(
        join(process.cwd(), '.env.local'),
        {
            CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
            CONVEX_SELF_HOSTED_URL: CONVEX_URL,
            NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
            NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
            NEXT_PUBLIC_SITE_URL: APP_URL,
        },
        ['CONVEX_DEPLOYMENT']
    );

    console.log('Local Convex stack is ready. Updated .env.local with local Convex settings.');
}

async function cleanup(): Promise<void> {
    console.log('Cleaning up Docker containers...');
    await dockerCompose(['down', '--remove-orphans'], { ignoreExitCode: true });
}

let convexDev: LongRunningProcess | undefined;

async function mainWithoutDocker(): Promise<void> {
    if (STOP) {
        console.log(
            'The CLI-managed local deployment runs inside `pnpm dev`; stop that process to stop it.'
        );

        return;
    }

    if (await isListening(buildUrl(CONVEX_URL, '/version'))) {
        throw new Error(
            `Something is already listening on ${CONVEX_URL}. Stop \`pnpm dev\` or the Docker stack (\`pnpm convex:local:stop\`) first.`
        );
    }

    if (!(await isNodeSupportedByLocalBackend())) {
        throw new Error(UNSUPPORTED_NODE_MESSAGE);
    }

    if (RESET) {
        console.log('Resetting the CLI-managed local deployment...');
        cleanupGeneratedDirectories([CLI_LOCAL_DEPLOYMENT_DIRECTORY]);
    }

    console.log('Starting a local Convex deployment with the Convex CLI...');
    console.log(`  - Convex backend: ${CONVEX_URL}`);
    console.log(`  - Convex site: ${CONVEX_SITE_URL}`);
    console.log(`  - MailDev UI (\`pnpm mail:local\`): http://127.0.0.1:${MAILDEV_WEB_PORT}`);
    console.log(`  - App origin for auth: ${APP_URL}`);
    convexDev = startProcess(
        'convex',
        [
            'dev',
            '--until-success',
            '--tail-logs',
            'disable',
            '--local-cloud-port',
            CONVEX_PORT,
            '--local-site-port',
            CONVEX_SITE_PORT,
        ],
        {
            env: {
                CONVEX_AGENT_MODE: 'anonymous',
                CONVEX_DEPLOYMENT: '',
                CONVEX_SELF_HOSTED_URL: '',
                CONVEX_SELF_HOSTED_ADMIN_KEY: '',
            },
            // SIGINT lets the CLI stop the backend it started; SIGTERM would leave it on the port.
            killSignal: 'SIGINT',
            output: 'inherit',
        }
    );

    console.log('Waiting for Convex backend readiness...');
    await waitForConvexBackend(CONVEX_URL, convexDev);
    const instanceName = await fetchWithTimeout(buildUrl(CONVEX_URL, '/instance_name'));
    const deploymentName = (await instanceName.text()).trim();

    const { betterAuthSecret, jwks } = await generateAuthSecrets(storedCredentials);
    writeLocalStackCredentials(process.cwd(), {
        mysqlRootPassword: storedCredentials?.mysqlRootPassword,
        betterAuthSecret,
        jwks,
    });

    const commandEnv = buildConvexCommandEnv({
        deployment: { kind: 'cli-local', deploymentName },
        betterAuthSecret,
        jwks,
        convexUrl: CONVEX_URL,
        convexSiteUrl: CONVEX_SITE_URL,
        siteUrl: APP_URL,
        smtp: { host: '127.0.0.1', port: MAILDEV_SMTP_PORT },
    });

    console.log('Configuring Convex env vars...');
    await configureConvexEnvAtOnce(commandEnv, APP_URL, {
        setupSecret: process.env.SETUP_SECRET,
    });

    console.log('Deploying Convex functions...');
    const { exitCode } = await convexDev;

    if (exitCode !== 0) {
        throw new Error(
            `convex dev failed to deploy the functions (exit=${exitCode ?? 'unknown'})`
        );
    }

    upsertEnvFile(
        join(process.cwd(), '.env.local'),
        {
            CONVEX_DEPLOYMENT: `anonymous:${deploymentName}`,
            NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
            NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
            NEXT_PUBLIC_SITE_URL: APP_URL,
        },
        ['CONVEX_SELF_HOSTED_ADMIN_KEY', 'CONVEX_SELF_HOSTED_URL']
    );

    console.log('Local Convex deployment is ready. Updated .env.local with local Convex settings.');
    console.log(
        'Run `pnpm dev` to start the backend, its dashboard (http://127.0.0.1:6790) and Next.js.'
    );
    console.log('Run `pnpm mail:local` alongside it to capture outgoing email with MailDev.');
}

if (NO_DOCKER) {
    mainWithoutDocker().catch(async error => {
        console.error('\nLocal Convex deployment setup failed.');
        console.error(error instanceof Error ? error.message : error);

        if (convexDev) {
            await stopProcess(convexDev);
        }

        process.exitCode = 1;
    });
} else {
    main().catch(async error => {
        console.error('\nLocal Convex stack setup failed.');

        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }

        try {
            await cleanup();
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }

        process.exitCode = 1;
    });
}
