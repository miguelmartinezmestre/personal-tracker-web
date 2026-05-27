#!/usr/bin/env node

import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { symmetricEncrypt } from 'better-auth/crypto';
import { generateExportedKeyPair } from 'better-auth/plugins';

const PNPM_COMMAND = 'pnpm';
const DOCKER_COMMAND = process.platform === 'win32' ? 'docker.exe' : 'docker';
const USE_SHELL_FOR_PNPM = process.platform === 'win32';
const COMPOSE_FILE = 'infrastructure/docker-compose.yml';
const GENERATED_DIRECTORIES = ['mysql-data', 'mysql-data-dev', 'data', 'data-dev'];
const CONVEX_START_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;
const HTTP_REQUEST_TIMEOUT_MS = 3_000;

const CONVEX_PORT = process.env.CONVEX_PORT ?? process.env.PORT ?? '3210';
const CONVEX_SITE_PORT = process.env.CONVEX_SITE_PORT ?? process.env.SITE_PROXY_PORT ?? '3211';
const DASHBOARD_PORT = process.env.CONVEX_DASHBOARD_PORT ?? process.env.DASHBOARD_PORT ?? '6791';
const CONVEX_URL = process.env.CONVEX_SELF_HOSTED_URL ?? `http://127.0.0.1:${CONVEX_PORT}`;
const CONVEX_SITE_URL =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? `http://127.0.0.1:${CONVEX_SITE_PORT}`;
const APP_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000';

interface RunCommandOptions extends SpawnOptionsWithoutStdio {
    ignoreExitCode?: boolean;
}

function formatCommand(command: string, args: Array<string>): string {
    return [command, ...args].join(' ');
}

function stripAnsi(value: string): string {
    let result = '';
    let index = 0;

    while (index < value.length) {
        const currentCharCode = value.charCodeAt(index);
        if (currentCharCode === 27 && value[index + 1] === '[') {
            index += 2;

            while (index < value.length) {
                const ansiCode = value.charCodeAt(index);
                index += 1;

                if (ansiCode >= 64 && ansiCode <= 126) {
                    break;
                }
            }

            continue;
        }

        result += value[index];
        index += 1;
    }

    return result;
}

function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
        if (!key || key.startsWith('=')) {
            continue;
        }

        if (typeof value === 'string') {
            sanitized[key] = value;
        }
    }

    return sanitized as NodeJS.ProcessEnv;
}

function runCommand(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<void> {
    const { ignoreExitCode = false, ...spawnOptions } = options;

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: 'inherit',
            ...spawnOptions,
        });

        child.on('error', error => {
            reject(error);
        });

        child.on('close', (code, signal) => {
            if (code === 0 || ignoreExitCode) {
                resolve();
                return;
            }

            const signalSuffix = signal ? ` signal=${signal}` : '';
            reject(
                new Error(
                    `Command failed (${formatCommand(command, args)}) with exit code ${code}${signalSuffix}`
                )
            );
        });
    });
}

function runCommandWithInput(
    command: string,
    args: Array<string>,
    input: string,
    options: RunCommandOptions = {}
): Promise<void> {
    const { ignoreExitCode = false, ...spawnOptions } = options;

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['pipe', 'inherit', 'inherit'],
            ...spawnOptions,
        });

        child.stdin?.write(input);
        child.stdin?.end();

        child.on('error', error => {
            reject(error);
        });

        child.on('close', (code, signal) => {
            if (code === 0 || ignoreExitCode) {
                resolve();
                return;
            }

            const signalSuffix = signal ? ` signal=${signal}` : '';
            reject(
                new Error(
                    `Command failed (${formatCommand(command, args)}) with exit code ${code}${signalSuffix}`
                )
            );
        });
    });
}

function runCommandCapture(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<string> {
    const { ignoreExitCode = false, ...spawnOptions } = options;

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            ...spawnOptions,
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', chunk => {
            stdout += String(chunk);
        });

        child.stderr?.on('data', chunk => {
            stderr += String(chunk);
        });

        child.on('error', error => {
            reject(error);
        });

        child.on('close', (code, signal) => {
            if (code === 0 || ignoreExitCode) {
                resolve(`${stdout}${stderr}`);
                return;
            }

            const signalSuffix = signal ? ` signal=${signal}` : '';
            reject(
                new Error(
                    `Command failed (${formatCommand(command, args)}) with exit code ${code}${signalSuffix}\n${stdout}${stderr}`
                )
            );
        });
    });
}

function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return {
        ...sanitizeEnv(process.env),
        PORT: CONVEX_PORT,
        SITE_PROXY_PORT: CONVEX_SITE_PORT,
        DASHBOARD_PORT,
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

function buildUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, '')}${path}`;
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const abortController = new AbortController();

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            abortController.abort();
            reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([
            fetch(url, {
                signal: abortController.signal,
            }),
            timeoutPromise,
        ]);
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
    }
}

async function waitForHttp(
    url: string,
    timeoutMs: number,
    isReady: (response: Response) => boolean
): Promise<void> {
    const start = Date.now();
    let lastStatus: number | null = null;
    let lastError: string | null = null;
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        attempts += 1;

        try {
            const response = await fetchWithTimeout(url, HTTP_REQUEST_TIMEOUT_MS);
            lastStatus = response.status;

            if (isReady(response)) {
                return;
            }
        } catch (error) {
            if (error instanceof Error) {
                lastError = error.message;
            } else {
                lastError = String(error);
            }
        }

        if (attempts % 5 === 0) {
            const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
            const progressHint =
                lastStatus !== null
                    ? `last status=${lastStatus}`
                    : `last error=${lastError ?? 'unknown'}`;
            console.log(`Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`);
        }

        await sleep(POLL_INTERVAL_MS);
    }

    const statusMessage =
        lastStatus !== null ? `last status=${lastStatus}` : `last error=${lastError ?? 'unknown'}`;
    throw new Error(`Timed out waiting for ${url} (${statusMessage})`);
}

async function generateStaticJwks(secret: string): Promise<string> {
    const { publicWebKey, privateWebKey } = await generateExportedKeyPair({
        jwks: {
            keyPairConfig: {
                alg: 'RS256',
            },
        },
    });

    const encryptedPrivateKey = await symmetricEncrypt({
        key: secret,
        data: JSON.stringify(privateWebKey),
    });

    const jwksDocument = [
        {
            alg: 'RS256',
            createdAt: Date.now(),
            id: randomBytes(16).toString('hex'),
            privateKey: JSON.stringify(encryptedPrivateKey),
            publicKey: JSON.stringify(publicWebKey),
        },
    ];

    return JSON.stringify(jwksDocument);
}

function extractAdminKey(rawOutput: string): string {
    const normalizedOutput = stripAnsi(rawOutput);
    const match = normalizedOutput.match(/convex-self-hosted\|[^\s'"`]+/);

    if (!match) {
        throw new Error(
            `Could not extract CONVEX_SELF_HOSTED_ADMIN_KEY from command output:\n${rawOutput}`
        );
    }

    return match[0];
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
    return {
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
    };
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
}

async function main(): Promise<void> {
    console.log('Resetting local Convex docker compose...');
    await dockerCompose(['down', '-v', '--remove-orphans'], { ignoreExitCode: true });
    cleanupGeneratedDirectories();

    console.log('Starting local Convex backend docker compose services...');
    console.log(`  - Convex backend: ${CONVEX_URL}`);
    console.log(`  - Convex site: ${CONVEX_SITE_URL}`);
    console.log(`  - Convex dashboard: http://127.0.0.1:${DASHBOARD_PORT}`);
    console.log(`  - App origin for auth: ${APP_URL}`);
    await dockerCompose(['up', '-d', 'mysql', 'backend']);

    console.log('Waiting for Convex backend readiness...');
    await waitForHttp(buildUrl(CONVEX_URL, '/version'), CONVEX_START_TIMEOUT_MS, response => {
        return response.ok;
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
