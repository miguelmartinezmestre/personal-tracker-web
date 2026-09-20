#!/usr/bin/env node

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { redactSensitiveText } from './lib/command';
import { buildStackEnvironment } from './lib/stack-environment';
import { readLocalStackCredentials, writeLocalStackCredentials } from './lib/local-stack-state';
import {
    bootstrapConvexCredentials,
    buildConvexCommandEnv,
    configureConvexEnv,
    createDockerComposeHelpers,
    deployConvexFunctions,
    waitForConvexBackend,
} from './lib/convex-stack';

const COMPOSE_FILE = 'infrastructure/docker-compose.yml';
const GENERATED_DIRECTORIES = [
    join('infrastructure', 'mysql-data'),
    join('infrastructure', 'data'),
] as const;

const CONVEX_PORT = process.env.CONVEX_PORT ?? process.env.PORT ?? '3210';
const CONVEX_SITE_PORT = process.env.CONVEX_SITE_PORT ?? process.env.SITE_PROXY_PORT ?? '3211';
const DASHBOARD_PORT = process.env.CONVEX_DASHBOARD_PORT ?? process.env.DASHBOARD_PORT ?? '6791';
const MAILHOG_SMTP_PORT = process.env.MAILHOG_SMTP_PORT ?? '1025';
const MAILHOG_UI_PORT = process.env.MAILHOG_UI_PORT ?? '8025';
const CONVEX_URL = process.env.CONVEX_SELF_HOSTED_URL ?? `http://127.0.0.1:${CONVEX_PORT}`;
const CONVEX_SITE_URL =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? `http://127.0.0.1:${CONVEX_SITE_PORT}`;
const APP_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000';
const RESET = process.argv.includes('--reset');
const STOP = process.argv.includes('--stop');
if (RESET && STOP) {
    throw new Error('Choose stop or reset, not both');
}
if (RESET && !process.argv.includes('--confirm')) throw new Error('Reset requires --confirm');
const savedCredentials = RESET ? undefined : readLocalStackCredentials(process.cwd());
const MYSQL_ROOT_PASSWORD =
    savedCredentials?.mysqlRootPassword ??
    process.env.MYSQL_ROOT_PASSWORD ??
    randomBytes(24).toString('base64url');

function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return buildStackEnvironment({
        mode: 'local',
        overrides: {
            PORT: CONVEX_PORT,
            SITE_PROXY_PORT: CONVEX_SITE_PORT,
            DASHBOARD_PORT,
            MAILHOG_SMTP_PORT,
            MAILHOG_UI_PORT,
            CONVEX_CLOUD_ORIGIN: CONVEX_URL,
            CONVEX_SITE_ORIGIN: CONVEX_SITE_URL,
            NEXT_PUBLIC_DEPLOYMENT_URL: CONVEX_URL,
            MYSQL_ROOT_PASSWORD,
            DATABASE_URL: `mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/convex_self_hosted`,
            MYSQL_URL: `mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306`,
            ...extraEnv,
        },
    });
}

const { dockerCompose, dockerComposeCapture } = createDockerComposeHelpers({
    composeFile: COMPOSE_FILE,
    getComposeEnv,
});

function cleanupGeneratedDirectories(): void {
    const workspaceRoot = resolve(process.cwd());
    for (const relativePath of GENERATED_DIRECTORIES) {
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

function upsertEnvFile(filePath: string, updates: Record<string, string>): void {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    const newline = existing.includes('\r\n') ? '\r\n' : '\n';
    const lines = existing.length > 0 ? existing.replace(/\r?\n$/, '').split(/\r?\n/) : [];
    const seenKeys = new Set<string>();

    const updatedLines = lines.map(line => {
        for (const [key, value] of Object.entries(updates)) {
            const matcher = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
            if (!matcher.test(line)) {
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
        cleanupGeneratedDirectories();
    } else if (
        !savedCredentials &&
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
    console.log(`  - MailHog UI: http://127.0.0.1:${MAILHOG_UI_PORT}`);
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
        adminKey,
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

    upsertEnvFile(join(process.cwd(), '.env.local'), {
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_SELF_HOSTED_URL: CONVEX_URL,
        NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
        NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
        NEXT_PUBLIC_SITE_URL: APP_URL,
    });

    console.log('Local Convex stack is ready. Updated .env.local with local Convex settings.');
}

async function cleanup(): Promise<void> {
    console.log('Cleaning up Docker containers...');
    await dockerCompose(['down', '--remove-orphans'], { ignoreExitCode: true });
}

main().catch(async error => {
    console.error('\nLocal Convex stack setup failed.');
    if (error instanceof Error) {
        console.error(redactSensitiveText(error.message));
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
