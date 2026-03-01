#!/usr/bin/env node

import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import process from 'node:process';
import { symmetricEncrypt } from 'better-auth/crypto';
import { generateExportedKeyPair } from 'better-auth/plugins';

const PNPM_COMMAND = 'pnpm';
const DOCKER_COMMAND = process.platform === 'win32' ? 'docker.exe' : 'docker';
const USE_SHELL_FOR_PNPM = process.platform === 'win32';

const COMPOSE_FILE = 'infrastructure/docker-compose.e2e.yml';
const COMPOSE_PROJECT = 'metricas-e2e';

const E2E_CONVEX_PORT = process.env.E2E_CONVEX_PORT ?? '4210';
const E2E_CONVEX_SITE_PORT = process.env.E2E_CONVEX_SITE_PORT ?? '4211';
const E2E_FRONTEND_PORT = process.env.E2E_FRONTEND_PORT ?? '4300';
const E2E_NEXT_DIST_DIR = process.env.E2E_NEXT_DIST_DIR ?? '.next-e2e';

const CONVEX_URL = process.env.CONVEX_SELF_HOSTED_URL ?? `http://127.0.0.1:${E2E_CONVEX_PORT}`;
const CONVEX_SITE_URL =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? `http://127.0.0.1:${E2E_CONVEX_SITE_PORT}`;

const CONVEX_START_TIMEOUT_MS = 120_000;
const FRONTEND_START_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 1_000;
const HTTP_REQUEST_TIMEOUT_MS = 3_000;
const FRONTEND_STOP_TIMEOUT_MS = 10_000;
const SHOW_NEXT_LOGS = process.env.E2E_SHOW_NEXT_LOGS === 'true';
const FRONTEND_LOG_TAIL_LIMIT = 120;

const rawForwardedPlaywrightArgs = process.argv.slice(2);
const forwardedPlaywrightArgs =
    rawForwardedPlaywrightArgs[0] === '--'
        ? rawForwardedPlaywrightArgs.slice(1)
        : rawForwardedPlaywrightArgs;

let frontendProcess: ChildProcess | null = null;
let cleanupInProgress = false;
let receivedTerminationSignal = false;
let frontendLogTail: Array<string> = [];

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

function pushFrontendLogChunk(source: 'stdout' | 'stderr', chunk: string): void {
    const lines = chunk.replace(/\r\n/g, '\n').split('\n');

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        frontendLogTail.push(`[next:${source}] ${line}`);
        if (frontendLogTail.length > FRONTEND_LOG_TAIL_LIMIT) {
            frontendLogTail = frontendLogTail.slice(-FRONTEND_LOG_TAIL_LIMIT);
        }
    }
}

function getFrontendFailureSuffix(): string {
    if (SHOW_NEXT_LOGS || frontendLogTail.length === 0) {
        return '';
    }

    return `\nLast Next.js logs:\n${frontendLogTail.join('\n')}`;
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function buildUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, '')}${path}`;
}

async function findAvailableFrontendPort(preferredPort: string): Promise<string> {
    const parsedPort = Number.parseInt(preferredPort, 10);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        throw new Error(`Invalid E2E_FRONTEND_PORT value: ${preferredPort}`);
    }

    for (let candidatePort = parsedPort; candidatePort < parsedPort + 20; candidatePort += 1) {
        const isAvailable = await new Promise<boolean>(resolve => {
            const server = createServer();

            server.once('error', () => {
                resolve(false);
            });

            server.once('listening', () => {
                server.close(() => {
                    resolve(true);
                });
            });

            server.listen(candidatePort);
        });

        if (isAvailable) {
            return String(candidatePort);
        }
    }

    throw new Error(
        `No available frontend port found between ${parsedPort} and ${parsedPort + 19}`
    );
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const abortController = new AbortController();

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            abortController.abort();
            reject(new Error(`Request timeout after ${String(timeoutMs)}ms`));
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
                    `Command failed (${formatCommand(command, args)}) with exit code ${String(code)}${signalSuffix}`
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
                    `Command failed (${formatCommand(command, args)}) with exit code ${String(code)}${signalSuffix}`
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
                    `Command failed (${formatCommand(command, args)}) with exit code ${String(code)}${signalSuffix}\n${stdout}${stderr}`
                )
            );
        });
    });
}

function composeArgs(args: Array<string>): Array<string> {
    return ['compose', '-f', COMPOSE_FILE, '-p', COMPOSE_PROJECT, ...args];
}

function dockerCompose(args: Array<string>, options: RunCommandOptions = {}): Promise<void> {
    const composeEnv = {
        ...sanitizeEnv(process.env),
        PORT: E2E_CONVEX_PORT,
        SITE_PROXY_PORT: E2E_CONVEX_SITE_PORT,
    };

    return runCommand(DOCKER_COMMAND, composeArgs(args), {
        ...options,
        env: {
            ...composeEnv,
            ...(options.env ?? {}),
        },
    });
}

function dockerComposeCapture(
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<string> {
    const composeEnv = {
        ...sanitizeEnv(process.env),
        PORT: E2E_CONVEX_PORT,
        SITE_PROXY_PORT: E2E_CONVEX_SITE_PORT,
    };

    return runCommandCapture(DOCKER_COMMAND, composeArgs(args), {
        ...options,
        env: {
            ...composeEnv,
            ...(options.env ?? {}),
        },
    });
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

function cleanupNextArtifacts(baseDistDir: string, nextDistDir: string): void {
    const cwd = process.cwd();
    const candidateDirectories = new Set<string>();

    candidateDirectories.add(nextDistDir);

    for (const entry of readdirSync(cwd, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }

        if (entry.name === baseDistDir || entry.name.startsWith(`${baseDistDir}-`)) {
            candidateDirectories.add(entry.name);
        }
    }

    for (const directory of candidateDirectories) {
        const directoryPath = join(cwd, directory);
        if (!existsSync(directoryPath)) {
            continue;
        }

        rmSync(directoryPath, { recursive: true, force: true });
    }
}

function buildCommandEnv(
    adminKey: string,
    betterAuthSecret: string,
    jwks: string,
    baseUrl: string,
    siteUrl: string,
    nextDistDir: string
): NodeJS.ProcessEnv {
    const baseEnv = sanitizeEnv(process.env);

    return {
        ...baseEnv,
        ALLOW_PROMOTE_DEV: 'true',
        BASE_URL: baseUrl,
        BETTER_AUTH_SECRET: betterAuthSecret,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_SELF_HOSTED_URL: CONVEX_URL,
        JWKS: jwks,
        NEXT_PUBLIC_CONVEX_SITE_URL: CONVEX_SITE_URL,
        NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
        NEXT_PUBLIC_SITE_URL: siteUrl,
        NEXT_DIST_DIR: nextDistDir,
        SITE_URL: siteUrl,
    };
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
            `Could not extract CONVEX_SELF_HOSTED_ADMIN_KEY from output:\n${rawOutput}`
        );
    }

    return match[0];
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
                    ? `last status=${String(lastStatus)}`
                    : `last error=${lastError ?? 'unknown'}`;
            console.log(`Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`);
        }

        await sleep(POLL_INTERVAL_MS);
    }

    const statusMessage =
        lastStatus !== null
            ? `last status=${String(lastStatus)}`
            : `last error=${lastError ?? 'unknown'}`;
    throw new Error(`Timed out waiting for ${url} (${statusMessage})`);
}

async function waitForFrontendReady(
    url: string,
    timeoutMs: number,
    child: ChildProcess,
    isReady: (response: Response) => boolean
): Promise<void> {
    const start = Date.now();
    let lastStatus: number | null = null;
    let lastError: string | null = null;
    let attempts = 0;
    let frontendStartError: Error | null = null;

    const onFrontendError = (error: Error) => {
        frontendStartError = error;
    };

    child.on('error', onFrontendError);

    try {
        while (Date.now() - start < timeoutMs) {
            attempts += 1;

            if (frontendStartError !== null) {
                throw new Error(
                    `Frontend process failed to start: ${String(frontendStartError)}${getFrontendFailureSuffix()}`
                );
            }

            if (child.exitCode !== null) {
                throw new Error(
                    `Frontend process exited before readiness check finished (code=${String(child.exitCode)})${getFrontendFailureSuffix()}`
                );
            }

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
                        ? `last status=${String(lastStatus)}`
                        : `last error=${lastError ?? 'unknown'}`;
                console.log(
                    `Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`
                );
            }

            await sleep(POLL_INTERVAL_MS);
        }

        const statusMessage =
            lastStatus !== null
                ? `last status=${String(lastStatus)}`
                : `last error=${lastError ?? 'unknown'}`;
        throw new Error(
            `Timed out waiting for ${url} (${statusMessage})${getFrontendFailureSuffix()}`
        );
    } finally {
        child.off('error', onFrontendError);
    }
}

async function stopFrontend(): Promise<void> {
    if (!frontendProcess) {
        return;
    }

    const child = frontendProcess;
    frontendProcess = null;

    if (child.exitCode !== null) {
        return;
    }

    if (process.platform === 'win32' && typeof child.pid === 'number') {
        await runCommand('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
            ignoreExitCode: true,
        });

        await new Promise<void>(resolve => {
            const timeout = setTimeout(resolve, 2_000);
            child.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        return;
    }

    await new Promise<void>(resolve => {
        const timeout = setTimeout(() => {
            if (child.exitCode === null) {
                child.kill('SIGKILL');
            }
        }, FRONTEND_STOP_TIMEOUT_MS);

        child.once('exit', () => {
            clearTimeout(timeout);
            resolve();
        });

        child.kill('SIGTERM');
    });
}

async function cleanup(): Promise<void> {
    if (cleanupInProgress) {
        return;
    }

    cleanupInProgress = true;

    await stopFrontend().catch(error => {
        console.error('Error while stopping frontend:', error);
    });

    await dockerCompose(['down', '-v', '--remove-orphans'], {
        ignoreExitCode: true,
    }).catch(error => {
        console.error('Error while tearing down docker compose:', error);
    });
}

async function handleTermination(signal: NodeJS.Signals): Promise<void> {
    if (receivedTerminationSignal) {
        return;
    }

    receivedTerminationSignal = true;
    console.log(`\nReceived ${signal}. Cleaning up e2e stack...`);

    await cleanup();
    process.exit(130);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        void handleTermination(signal);
    });
}

async function main(): Promise<void> {
    console.log('Resetting previous isolated Convex stack...');
    await dockerCompose(['down', '-v', '--remove-orphans'], { ignoreExitCode: true });

    console.log('Starting isolated Convex docker compose...');
    await dockerCompose(['up', '-d']);

    console.log('Waiting for Convex backend readiness...');
    await waitForHttp(buildUrl(CONVEX_URL, '/version'), CONVEX_START_TIMEOUT_MS, response => {
        return response.ok;
    });

    console.log('Generating admin key from Convex backend...');
    const adminKeyOutput = await dockerComposeCapture([
        'exec',
        '-T',
        'backend',
        './generate_admin_key.sh',
    ]);
    const adminKey = extractAdminKey(adminKeyOutput);
    const betterAuthSecret = randomBytes(32).toString('base64');
    const jwks = await generateStaticJwks(betterAuthSecret);
    const frontendPort = await findAvailableFrontendPort(E2E_FRONTEND_PORT);

    if (frontendPort !== E2E_FRONTEND_PORT) {
        console.log(`Frontend port ${E2E_FRONTEND_PORT} is in use, using ${frontendPort} instead.`);
    }

    const baseUrl = `http://127.0.0.1:${frontendPort}`;
    const siteUrl = baseUrl;
    const nextDistDir = E2E_NEXT_DIST_DIR;
    const commandEnv = buildCommandEnv(
        adminKey,
        betterAuthSecret,
        jwks,
        baseUrl,
        siteUrl,
        nextDistDir
    );

    console.log('Configuring Convex env vars for e2e...');
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'SITE_URL', siteUrl], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'ALLOW_PROMOTE_DEV', 'true'], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
    await runCommand(
        PNPM_COMMAND,
        ['exec', 'convex', 'env', 'set', 'BETTER_AUTH_SECRET', betterAuthSecret],
        {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        }
    );
    await runCommandWithInput(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'JWKS'], `${jwks}\n`, {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });

    console.log('Deploying Convex functions...');
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'dev', '--once', '--tail-logs', 'disable'], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });

    cleanupNextArtifacts(E2E_NEXT_DIST_DIR, nextDistDir);

    console.log('Starting frontend...');
    frontendLogTail = [];

    frontendProcess = spawn(PNPM_COMMAND, ['dev', '--port', frontendPort], {
        cwd: process.cwd(),
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
        stdio: SHOW_NEXT_LOGS ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    if (!SHOW_NEXT_LOGS) {
        frontendProcess.stdout?.on('data', chunk => {
            pushFrontendLogChunk('stdout', String(chunk));
        });

        frontendProcess.stderr?.on('data', chunk => {
            pushFrontendLogChunk('stderr', String(chunk));
        });
    }

    console.log('Waiting for frontend landing page readiness...');
    await waitForFrontendReady(
        buildUrl(baseUrl, '/'),
        FRONTEND_START_TIMEOUT_MS,
        frontendProcess,
        response => {
            return response.status < 500;
        }
    );

    console.log('Running Playwright e2e suite...');
    await runCommand(PNPM_COMMAND, ['exec', 'playwright', 'test', ...forwardedPlaywrightArgs], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });

    console.log('E2E suite finished successfully.');
}

main()
    .then(async () => {
        await cleanup();
    })
    .catch(async error => {
        console.error('\nE2E stack execution failed.');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }

        await cleanup();
        process.exitCode = 1;
    });
