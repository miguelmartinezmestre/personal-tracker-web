#!/usr/bin/env node

import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, runCommand, sanitizeEnv } from './lib/command';
import {
    bootstrapConvexCredentials,
    buildConvexCommandEnv,
    configureConvexEnv,
    createDockerComposeHelpers,
    deployConvexFunctions,
    HTTP_REQUEST_TIMEOUT_MS,
    POLL_INTERVAL_MS,
    waitForConvexBackend,
} from './lib/convex-stack';
import { buildUrl, fetchWithTimeout, sleep } from './lib/http';

const E2E_BUILD_META_FILE = 'build-meta.json';
const BUILD_FINGERPRINT_INPUTS = [
    'package.json',
    'pnpm-lock.yaml',
    'next.config.ts',
    'postcss.config.mjs',
    'proxy.ts',
    'tsconfig.json',
    'tsconfig.playwright.json',
];
const BUILD_FINGERPRINT_DIRECTORIES = ['src', 'convex', 'public', 'shared'];
const BUILD_FINGERPRINT_FILE_PREFIXES = ['tsconfig'];
const BUILD_FINGERPRINT_ENV_KEYS = [
    'BASE_URL',
    'BETTER_AUTH_URL',
    'CONVEX_SELF_HOSTED_URL',
    'NEXT_PUBLIC_CONVEX_SITE_URL',
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP',
    'NEXT_PUBLIC_SITE_URL',
    'SITE_URL',
    'EMAIL_PROVIDER',
    'EMAIL_FROM',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
];

function parseScriptArgs(rawArgs: string[]): {
    forwardedPlaywrightArgs: string[];
    rebuild: boolean;
} {
    const normalizedArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
    const forwardedPlaywrightArgs: string[] = [];
    let rebuild = false;

    for (const arg of normalizedArgs) {
        if (arg === '--rebuild') {
            rebuild = true;
            continue;
        }

        forwardedPlaywrightArgs.push(arg);
    }

    return { forwardedPlaywrightArgs, rebuild };
}

const { forwardedPlaywrightArgs, rebuild: rebuildFromArgs } = parseScriptArgs(
    process.argv.slice(2)
);
const SHOULD_FORCE_REBUILD = rebuildFromArgs || process.env.E2E_FORCE_BUILD === 'true';

const COMPOSE_FILE = 'infrastructure/docker-compose.e2e.yml';
const E2E_STORAGE_DIRECTORIES = [
    join('infrastructure', 'mysql-data-e2e'),
    join('infrastructure', 'convex-data-e2e'),
] as const;

function detectBrowserProject(args: string[]): string | null {
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
            return args[i + 1];
        }
        if (args[i].startsWith('--project=')) {
            return args[i].split('=')[1];
        }
    }
    return null;
}

const BROWSER_PROJECT = detectBrowserProject(forwardedPlaywrightArgs);
const COMPOSE_PROJECT = BROWSER_PROJECT ? `metricas-e2e-${BROWSER_PROJECT}` : 'metricas-e2e';

const PORT_OFFSETS: Record<string, { convex: number; site: number; frontend: number }> = {
    chromium: { convex: 0, site: 0, frontend: 0 },
};

const PORT_OFFSET = BROWSER_PROJECT ? (PORT_OFFSETS[BROWSER_PROJECT]?.convex ?? 0) : 0;
const SITE_PORT_OFFSET = BROWSER_PROJECT ? (PORT_OFFSETS[BROWSER_PROJECT]?.site ?? 0) : 0;
const FRONTEND_PORT_OFFSET = BROWSER_PROJECT ? (PORT_OFFSETS[BROWSER_PROJECT]?.frontend ?? 0) : 0;

const BASE_CONVEX_PORT = 4210;
const BASE_SITE_PORT = 4211;
const BASE_FRONTEND_PORT = 4300;

const E2E_CONVEX_PORT = process.env.E2E_CONVEX_PORT ?? String(BASE_CONVEX_PORT + PORT_OFFSET);
const E2E_CONVEX_SITE_PORT =
    process.env.E2E_CONVEX_SITE_PORT ?? String(BASE_SITE_PORT + SITE_PORT_OFFSET);
const E2E_FRONTEND_PORT =
    process.env.E2E_FRONTEND_PORT ?? String(BASE_FRONTEND_PORT + FRONTEND_PORT_OFFSET);
const E2E_MAILHOG_SMTP_PORT = process.env.E2E_MAILHOG_SMTP_PORT ?? '2026';
const E2E_MAILHOG_UI_PORT = process.env.E2E_MAILHOG_UI_PORT ?? '8026';
const E2E_NEXT_DIST_DIR =
    process.env.E2E_NEXT_DIST_DIR ??
    (BROWSER_PROJECT ? `.next-e2e-${BROWSER_PROJECT}` : '.next-e2e');
const E2E_FRONTEND_MODE = process.env.E2E_FRONTEND_MODE ?? 'production';

// Prefer E2E-specific overrides so ambient NEXT_PUBLIC_* / cloud URLs from the
// developer shell or .env.local cannot point the isolated stack at the wrong host.
const CONVEX_URL =
    process.env.E2E_CONVEX_URL ??
    process.env.CONVEX_SELF_HOSTED_URL ??
    `http://127.0.0.1:${E2E_CONVEX_PORT}`;
const CONVEX_SITE_URL =
    process.env.E2E_CONVEX_SITE_URL ?? `http://127.0.0.1:${E2E_CONVEX_SITE_PORT}`;

const FRONTEND_START_TIMEOUT_MS = 180_000;
const FRONTEND_STOP_TIMEOUT_MS = 10_000;
const SHOW_NEXT_LOGS = process.env.E2E_SHOW_NEXT_LOGS === 'true';
const FRONTEND_LOG_TAIL_LIMIT = 120;

let frontendProcess: ChildProcess | null = null;
let cleanupInProgress = false;
let receivedTerminationSignal = false;
let frontendLogTail: Array<string> = [];

interface E2EBuildMeta {
    fingerprint: string;
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

function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return {
        ...sanitizeEnv(process.env),
        PORT: E2E_CONVEX_PORT,
        SITE_PROXY_PORT: E2E_CONVEX_SITE_PORT,
        MAILHOG_SMTP_PORT: E2E_MAILHOG_SMTP_PORT,
        MAILHOG_UI_PORT: E2E_MAILHOG_UI_PORT,
        ...extraEnv,
    };
}

const { dockerCompose, dockerComposeCapture } = createDockerComposeHelpers({
    composeFile: COMPOSE_FILE,
    projectName: COMPOSE_PROJECT,
    getComposeEnv,
});

function cleanupNextArtifacts(nextDistDir: string): void {
    const directoryPath = join(process.cwd(), nextDistDir);
    if (!existsSync(directoryPath)) {
        return;
    }

    rmSync(directoryPath, { recursive: true, force: true });
}

function cleanupE2EStorage(): void {
    const workspaceRoot = resolve(process.cwd());

    for (const relativePath of E2E_STORAGE_DIRECTORIES) {
        const directoryPath = resolve(workspaceRoot, relativePath);
        if (
            !directoryPath.startsWith(`${workspaceRoot}${sep}`) &&
            directoryPath !== workspaceRoot
        ) {
            throw new Error(`Refusing to delete path outside workspace: ${directoryPath}`);
        }

        if (existsSync(directoryPath)) {
            rmSync(directoryPath, { recursive: true, force: true });
        }
    }
}

function collectBuildFingerprintFiles(relativePath: string, files: Set<string>): void {
    const absolutePath = join(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) {
        return;
    }

    const entries = readdirSync(absolutePath, { withFileTypes: true }).sort((left, right) =>
        left.name.localeCompare(right.name)
    );

    for (const entry of entries) {
        const childRelativePath = join(relativePath, entry.name);
        if (entry.isDirectory()) {
            collectBuildFingerprintFiles(childRelativePath, files);
            continue;
        }

        files.add(childRelativePath);
    }
}

function getBuildFingerprintFiles(): string[] {
    const files = new Set<string>();

    for (const file of BUILD_FINGERPRINT_INPUTS) {
        const absolutePath = join(process.cwd(), file);
        if (existsSync(absolutePath)) {
            files.add(file);
        }
    }

    for (const directory of BUILD_FINGERPRINT_DIRECTORIES) {
        collectBuildFingerprintFiles(directory, files);
    }

    const rootEntries = readdirSync(process.cwd(), { withFileTypes: true });
    for (const entry of rootEntries) {
        if (!entry.isFile()) {
            continue;
        }

        if (
            BUILD_FINGERPRINT_FILE_PREFIXES.some(prefix => entry.name.startsWith(prefix)) &&
            entry.name.endsWith('.json')
        ) {
            files.add(entry.name);
        }
    }

    return [...files].sort((left, right) => left.localeCompare(right));
}

function computeBuildFingerprint(env: NodeJS.ProcessEnv): string {
    const fingerprint = createHash('sha256');

    for (const relativePath of getBuildFingerprintFiles()) {
        fingerprint.update(relativePath);
        fingerprint.update('\0');
        fingerprint.update(readFileSync(join(process.cwd(), relativePath)));
        fingerprint.update('\0');
    }

    for (const key of BUILD_FINGERPRINT_ENV_KEYS) {
        fingerprint.update(`env:${key}`);
        fingerprint.update('\0');
        fingerprint.update(env[key] ?? '');
        fingerprint.update('\0');
    }

    return fingerprint.digest('hex');
}

function getBuildMetaPath(nextDistDir: string): string {
    return join(process.cwd(), nextDistDir, E2E_BUILD_META_FILE);
}

function readBuildMeta(nextDistDir: string): E2EBuildMeta | null {
    const buildMetaPath = getBuildMetaPath(nextDistDir);
    if (!existsSync(buildMetaPath)) {
        return null;
    }

    try {
        return JSON.parse(readFileSync(buildMetaPath, 'utf8')) as E2EBuildMeta;
    } catch {
        return null;
    }
}

function hasReusableBuild(nextDistDir: string, fingerprint: string): boolean {
    const buildIdPath = join(process.cwd(), nextDistDir, 'BUILD_ID');
    if (!existsSync(buildIdPath)) {
        return false;
    }

    const buildMeta = readBuildMeta(nextDistDir);
    return buildMeta?.fingerprint === fingerprint;
}

function writeBuildMeta(nextDistDir: string, fingerprint: string): void {
    const buildMetaPath = getBuildMetaPath(nextDistDir);
    mkdirSync(join(process.cwd(), nextDistDir), { recursive: true });
    writeFileSync(buildMetaPath, JSON.stringify({ fingerprint }, null, 2));
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
                    `Frontend process failed to start: ${frontendStartError}${getFrontendFailureSuffix()}`
                );
            }

            if (child.exitCode !== null) {
                throw new Error(
                    `Frontend process exited before readiness check finished (code=${child.exitCode})${getFrontendFailureSuffix()}`
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
                        ? `last status=${lastStatus}`
                        : `last error=${lastError ?? 'unknown'}`;
                console.log(
                    `Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`
                );
            }

            await sleep(POLL_INTERVAL_MS);
        }

        const statusMessage =
            lastStatus !== null
                ? `last status=${lastStatus}`
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
    const browserLabel = BROWSER_PROJECT ? ` [${BROWSER_PROJECT}]` : '';
    console.log(`Resetting previous isolated Convex stack${browserLabel}...`);
    await dockerCompose(['down', '-v', '--remove-orphans'], { ignoreExitCode: true });
    cleanupE2EStorage();

    console.log(`Starting isolated Convex docker compose${browserLabel}...`);
    console.log(`  - Convex backend: port ${E2E_CONVEX_PORT}`);
    console.log(`  - Convex site: port ${E2E_CONVEX_SITE_PORT}`);
    console.log(`  - Frontend: port ${E2E_FRONTEND_PORT}`);
    console.log(`  - MailHog UI: http://127.0.0.1:${E2E_MAILHOG_UI_PORT}`);
    console.log(`  - Docker project: ${COMPOSE_PROJECT}`);
    console.log(`  - Build directory: ${E2E_NEXT_DIST_DIR}`);
    await dockerCompose(['up', '-d']);

    console.log('Waiting for Convex backend readiness...');
    await waitForConvexBackend(CONVEX_URL);

    console.log('Generating admin key from Convex backend...');
    const { adminKey, betterAuthSecret, jwks } =
        await bootstrapConvexCredentials(dockerComposeCapture);
    const frontendPort = await findAvailableFrontendPort(E2E_FRONTEND_PORT);

    if (frontendPort !== E2E_FRONTEND_PORT) {
        console.log(`Frontend port ${E2E_FRONTEND_PORT} is in use, using ${frontendPort} instead.`);
    }

    const baseUrl = `http://127.0.0.1:${frontendPort}`;
    const siteUrl = baseUrl;
    const nextDistDir = E2E_NEXT_DIST_DIR;
    const baseEnv = sanitizeEnv(process.env);
    const e2eSetupSecret = baseEnv.E2E_SETUP_SECRET ?? 'metricas-tfg-local-e2e-setup-secret';
    const setupSecret = baseEnv.SETUP_SECRET ?? 'metricas-tfg-local-e2e-bootstrap-secret';
    const commandEnv = buildConvexCommandEnv({
        adminKey,
        betterAuthSecret,
        jwks,
        convexUrl: CONVEX_URL,
        convexSiteUrl: CONVEX_SITE_URL,
        siteUrl,
        allowLocalHttp: true,
        extra: {
            E2E_SETUP_SECRET: e2eSetupSecret,
            SETUP_SECRET: setupSecret,
            BASE_URL: baseUrl,
            NEXT_DIST_DIR: nextDistDir,
            PLAYWRIGHT_HTML_OPEN: baseEnv.PLAYWRIGHT_HTML_OPEN ?? 'never',
        },
    });

    console.log('Configuring Convex env vars for e2e...');
    await configureConvexEnv(commandEnv, siteUrl, { e2eSetupSecret, setupSecret });

    console.log('Deploying Convex functions...');
    await deployConvexFunctions(commandEnv);

    if (E2E_FRONTEND_MODE === 'production') {
        const buildFingerprint = computeBuildFingerprint(commandEnv);
        const shouldReuseBuild =
            !SHOULD_FORCE_REBUILD && hasReusableBuild(nextDistDir, buildFingerprint);

        if (shouldReuseBuild) {
            console.log('Reusing cached frontend build for e2e.');
        } else {
            if (SHOULD_FORCE_REBUILD) {
                console.log('Forcing frontend rebuild for e2e.');
            } else {
                console.log('Frontend sources changed, rebuilding e2e build.');
            }

            cleanupNextArtifacts(nextDistDir);
            await runCommand(PNPM_COMMAND, ['exec', 'next', 'build'], {
                env: commandEnv,
                shell: USE_SHELL_FOR_PNPM,
            });
            writeBuildMeta(nextDistDir, buildFingerprint);
        }
    }

    console.log('Starting frontend...');
    frontendLogTail = [];

    // Use `next dev` directly (not `pnpm dev`, which wraps `convex dev --start`
    // and does not accept `--port`). Production mode still uses `next start`.
    const frontendArgs =
        E2E_FRONTEND_MODE === 'production'
            ? ['exec', 'next', 'start', '--port', frontendPort]
            : ['exec', 'next', 'dev', '--port', frontendPort];

    frontendProcess = spawn(PNPM_COMMAND, frontendArgs, {
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

    console.log(`Running Playwright e2e suite${browserLabel}...`);
    try {
        await runCommand(PNPM_COMMAND, ['exec', 'playwright', 'test', ...forwardedPlaywrightArgs], {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message}${getFrontendFailureSuffix()}`, { cause: error });
    }

    console.log(`E2E suite finished successfully${browserLabel}.`);
}

main()
    .then(async () => {
        await cleanup();
    })
    .catch(async error => {
        const browserLabel = BROWSER_PROJECT ? ` [${BROWSER_PROJECT}]` : '';
        console.error(`\nE2E stack execution failed${browserLabel}.`);
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }

        await cleanup();
        process.exitCode = 1;
    });
