#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { extractAdminKey, generateStaticJwks } from './lib/auth';
import {
    DOCKER_COMMAND,
    PNPM_COMMAND,
    type RunCommandOptions,
    USE_SHELL_FOR_PNPM,
    runCommand,
    runCommandCapture,
    runCommandWithInput,
    sanitizeEnv,
} from './lib/command';
import { buildUrl, waitForHttp } from './lib/http';
import { DEFAULT_MAILHOG_SMTP_ENV, buildMailhogConvexEnv } from './lib/mailhog-email';

const COMPOSE_FILE = 'infrastructure/docker-compose.yml';
const GENERATED_DIRECTORIES = ['mysql-data', 'mysql-data-dev', 'data', 'data-dev'];
const CONVEX_START_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;
const HTTP_REQUEST_TIMEOUT_MS = 3_000;

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

function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return {
        ...sanitizeEnv(process.env),
        PORT: CONVEX_PORT,
        SITE_PROXY_PORT: CONVEX_SITE_PORT,
        DASHBOARD_PORT,
        MAILHOG_SMTP_PORT,
        MAILHOG_UI_PORT,
        CONVEX_CLOUD_ORIGIN: CONVEX_URL,
        CONVEX_SITE_ORIGIN: CONVEX_SITE_URL,
        NEXT_PUBLIC_DEPLOYMENT_URL: CONVEX_URL,
        ...extraEnv,
    };
}

function dockerCompose(args: Array<string>, options: RunCommandOptions = {}): Promise<void> {
    return runCommand(DOCKER_COMMAND, ['compose', '-f', COMPOSE_FILE, ...args], {
        ...options,
        env: getComposeEnv(options.env),
    });
}

function dockerComposeCapture(
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<string> {
    return runCommandCapture(DOCKER_COMMAND, ['compose', '-f', COMPOSE_FILE, ...args], {
        ...options,
        env: getComposeEnv(options.env),
    });
}

function cleanupGeneratedDirectories(): void {
    for (const directory of GENERATED_DIRECTORIES) {
        for (const parent of [process.cwd(), join(process.cwd(), 'infrastructure')]) {
            const directoryPath = join(parent, directory);
            if (!existsSync(directoryPath)) {
                continue;
            }

            rmSync(directoryPath, { recursive: true, force: true });
            console.log(`Removed generated directory: ${directoryPath}`);
        }
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

function buildConvexCommandEnv(
    adminKey: string,
    betterAuthSecret: string,
    jwks: string
): NodeJS.ProcessEnv {
    return buildMailhogConvexEnv({
        ...sanitizeEnv(process.env),
        BETTER_AUTH_SECRET: betterAuthSecret,
        BETTER_AUTH_URL: APP_URL,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_SELF_HOSTED_URL: CONVEX_URL,
        JWKS: jwks,
        NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
        NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
        NEXT_PUBLIC_SITE_URL: APP_URL,
        SITE_URL: APP_URL,
    });
}

async function setConvexEnvVar(
    commandEnv: NodeJS.ProcessEnv,
    key: string,
    value: string
): Promise<void> {
    await runCommandWithInput(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', key], `${value}\n`, {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
}

async function configureConvexEnv(commandEnv: NodeJS.ProcessEnv): Promise<void> {
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'SITE_URL', APP_URL], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'BETTER_AUTH_URL', APP_URL], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
    await runCommand(
        PNPM_COMMAND,
        ['exec', 'convex', 'env', 'set', 'BETTER_AUTH_SECRET', commandEnv.BETTER_AUTH_SECRET ?? ''],
        {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        }
    );
    await runCommandWithInput(
        PNPM_COMMAND,
        ['exec', 'convex', 'env', 'set', 'JWKS'],
        `${commandEnv.JWKS ?? ''}\n`,
        {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        }
    );

    for (const [key, value] of Object.entries(DEFAULT_MAILHOG_SMTP_ENV)) {
        await setConvexEnvVar(commandEnv, key, value);
    }
}

async function main(): Promise<void> {
    console.log('Resetting local Convex docker compose...');
    await dockerCompose(['down', '-v', '--remove-orphans'], { ignoreExitCode: true });
    cleanupGeneratedDirectories();

    console.log('Starting local Convex backend docker compose services...');
    console.log(`  - Convex backend: ${CONVEX_URL}`);
    console.log(`  - Convex site: ${CONVEX_SITE_URL}`);
    console.log(`  - Convex dashboard: http://127.0.0.1:${DASHBOARD_PORT}`);
    console.log(`  - MailHog UI: http://127.0.0.1:${MAILHOG_UI_PORT}`);
    console.log(`  - App origin for auth: ${APP_URL}`);
    await dockerCompose(['up', '-d', 'mysql', 'backend']);

    console.log('Waiting for Convex backend readiness...');
    await waitForHttp({
        url: buildUrl(CONVEX_URL, '/version'),
        timeoutMs: CONVEX_START_TIMEOUT_MS,
        requestTimeoutMs: HTTP_REQUEST_TIMEOUT_MS,
        pollIntervalMs: POLL_INTERVAL_MS,
        isReady: response => response.ok,
    });

    console.log('Starting local Convex dashboard...');
    await dockerCompose(['up', '-d', 'dashboard']);

    console.log('Generating Convex self-hosted admin key...');
    const adminKeyOutput = await dockerComposeCapture([
        'exec',
        '-T',
        'backend',
        './generate_admin_key.sh',
    ]);
    const adminKey = extractAdminKey(adminKeyOutput);
    const betterAuthSecret = randomBytes(32).toString('base64');
    const jwks = await generateStaticJwks(betterAuthSecret);
    const commandEnv = buildConvexCommandEnv(adminKey, betterAuthSecret, jwks);

    console.log('Configuring Convex env vars...');
    await configureConvexEnv(commandEnv);

    console.log('Deploying Convex functions...');
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'dev', '--once', '--tail-logs', 'disable'], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });

    upsertEnvFile(join(process.cwd(), '.env.local'), {
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_SELF_HOSTED_URL: CONVEX_URL,
        NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
        NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
    });

    console.log('Local Convex stack is ready. Updated .env.local with local Convex settings.');
}

main().catch(error => {
    console.error('\nLocal Convex stack setup failed.');
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }

    process.exitCode = 1;
});
