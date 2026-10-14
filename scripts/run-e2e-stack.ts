#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import getPort, { portNumbers } from 'get-port';
import { z } from 'zod';
import {
    buildUrl,
    isListening,
    type LongRunningProcess,
    PNPM_COMMAND,
    overlayEnv,
    runCommand,
    startProcess,
    stopProcess,
    waitForHttp,
} from './lib/command';
import {
    assertNodeSupportedByLocalBackend,
    type LocalProcess,
    startLocalBackend,
    startMailDev,
} from './lib/convex-local-backend';
import {
    bootstrapConvexCredentials,
    buildConvexCommandEnv,
    configureConvexEnv,
    createDockerComposeHelpers,
    deployConvexFunctions,
    generateAuthSecrets,
    waitForConvexBackend,
} from './lib/convex-stack';
const E2E_BUILD_META_FILE = 'build-meta.json';
const BUILD_FINGERPRINT_INPUTS = [
    'package.json',
    'pnpm-lock.yaml',
    'next.config.ts',
    'postcss.config.mjs',
    'tsconfig.json',
    'tsconfig.playwright.json',
];
const BUILD_FINGERPRINT_DIRECTORIES = ['src', 'convex'];
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
// Own flags are removed; everything else, `--project` included, is forwarded to Playwright.
// pnpm may insert a bare `--` before forwarded arguments, after the script's own flags.
const SCRIPT_ARGS = process.argv.slice(2).filter(arg => arg !== '--');
const OWN_FLAGS = new Set(['rebuild', 'no-docker']);
const { values: flags, tokens } = parseArgs({
    args: SCRIPT_ARGS,
    options: {
        rebuild: { type: 'boolean' },
        'no-docker': { type: 'boolean' },
        project: { type: 'string' },
    },
    strict: false,
    allowPositionals: true,
    tokens: true,
});
const ownFlagIndexes = new Set(
    tokens.flatMap(token =>
        token.kind === 'option' && OWN_FLAGS.has(token.name) ? [token.index] : []
    )
);
const forwardedPlaywrightArgs = SCRIPT_ARGS.filter((_, index) => !ownFlagIndexes.has(index));
const NO_DOCKER = flags['no-docker'] === true;
// Pinned like the Docker image digest, so runs without Docker are reproducible.
const E2E_CONVEX_BACKEND_VERSION =
    process.env.E2E_CONVEX_BACKEND_VERSION ?? 'precompiled-2026-10-06-a3538c6';
const SHOULD_FORCE_REBUILD = flags.rebuild === true || process.env.E2E_FORCE_BUILD === 'true';
const COMPOSE_FILE = 'infrastructure/docker-compose.e2e.yml';
const BROWSER_PROJECT = typeof flags.project === 'string' ? flags.project : null;
const COMPOSE_PROJECT = BROWSER_PROJECT ? `metricas-e2e-${BROWSER_PROJECT}` : 'metricas-e2e';
const E2E_CONVEX_PORT = process.env.E2E_CONVEX_PORT ?? '4210';
const E2E_CONVEX_SITE_PORT = process.env.E2E_CONVEX_SITE_PORT ?? '4211';
const E2E_FRONTEND_PORT = process.env.E2E_FRONTEND_PORT ?? '4300';
const E2E_MAILDEV_SMTP_PORT = process.env.E2E_MAILDEV_SMTP_PORT ?? '2026';
const E2E_MAILDEV_WEB_PORT = process.env.E2E_MAILDEV_WEB_PORT ?? '1081';
const E2E_NEXT_DIST_DIR =
    process.env.E2E_NEXT_DIST_DIR ??
    (BROWSER_PROJECT ? `.next-e2e-${BROWSER_PROJECT}` : '.next-e2e');
const E2E_FRONTEND_MODE = process.env.E2E_FRONTEND_MODE ?? 'production';
const CONVEX_URL = process.env.E2E_CONVEX_URL ?? `http://127.0.0.1:${E2E_CONVEX_PORT}`;
const CONVEX_SITE_URL =
    process.env.E2E_CONVEX_SITE_URL ?? `http://127.0.0.1:${E2E_CONVEX_SITE_PORT}`;
const FRONTEND_START_TIMEOUT_MS = 180000;
const SHOW_NEXT_LOGS = process.env.E2E_SHOW_NEXT_LOGS === 'true';
const FRONTEND_LOG_TAIL_LIMIT = 120;
let frontendProcess: LongRunningProcess | null = null;
// Backend and MailDev when running without Docker.
const localProcesses: Array<LocalProcess> = [];
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
function getComposeEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return overlayEnv({
        PORT: E2E_CONVEX_PORT,
        SITE_PROXY_PORT: E2E_CONVEX_SITE_PORT,
        MAILDEV_SMTP_PORT: E2E_MAILDEV_SMTP_PORT,
        MAILDEV_WEB_PORT: E2E_MAILDEV_WEB_PORT,
        ...extraEnv,
    });
}
const { dockerCompose, dockerComposeCapture } = createDockerComposeHelpers({
    composeFile: COMPOSE_FILE,
    projectName: COMPOSE_PROJECT,
    getComposeEnv,
});
type CleanupMode = 'success' | 'failure';
const E2E_WORKSPACE_ARTIFACT_DIRS = [
    'test-results',
    'playwright-report',
    'blob-report',
    'reports/e2e',
    'tests/.auth',
];
function assertSafeRepoRelativeDirectory(relativePath: string): string {
    const root = resolve(process.cwd());
    const directoryPath = resolve(root, relativePath);
    if (!directoryPath.startsWith(`${root}${sep}`)) {
        throw new Error(`Refusing to delete an invalid E2E artifact path: ${relativePath}`);
    }
    return directoryPath;
}
function removeGuardedDirectory(relativePath: string): void {
    const directoryPath = assertSafeRepoRelativeDirectory(relativePath);
    if (!existsSync(directoryPath)) {
        return;
    }
    rmSync(directoryPath, { recursive: true, force: true });
}
function isNextE2eDistDirName(name: string): boolean {
    return name === '.next-e2e' || name.startsWith('.next-e2e-');
}
function cleanupNextArtifacts(nextDistDir: string): void {
    if (!isNextE2eDistDirName(nextDistDir)) {
        throw new Error('Refusing to delete an invalid E2E build path');
    }
    removeGuardedDirectory(nextDistDir);
}
function listNextE2eDistDirs(): string[] {
    return readdirSync(process.cwd(), { withFileTypes: true })
        .filter(entry => entry.isDirectory() && isNextE2eDistDirName(entry.name))
        .map(entry => entry.name);
}
function removeE2eWorkspaceArtifacts(): void {
    for (const relativePath of E2E_WORKSPACE_ARTIFACT_DIRS) {
        removeGuardedDirectory(relativePath);
    }
    for (const nextDistDir of listNextE2eDistDirs()) {
        cleanupNextArtifacts(nextDistDir);
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
        const parsed: unknown = JSON.parse(readFileSync(buildMetaPath, 'utf8'));
        return z.object({ fingerprint: z.string() }).parse(parsed);
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
async function stopFrontend(): Promise<void> {
    if (!frontendProcess) {
        return;
    }
    const subprocess = frontendProcess;
    frontendProcess = null;
    await stopProcess(subprocess);
}
async function captureFailureLogs(): Promise<void> {
    try {
        mkdirSync('reports/e2e', { recursive: true });
        writeFileSync(
            `reports/e2e/frontend-${BROWSER_PROJECT ?? 'all'}.log`,
            frontendLogTail.join('\n')
        );
        // Without Docker the backend and MailDev already write their own logs there.
        if (!NO_DOCKER) {
            const backendLog = await dockerComposeCapture(
                ['logs', '--no-color', '--tail', '1000'],
                { ignoreExitCode: true }
            );
            writeFileSync(`reports/e2e/backend-${BROWSER_PROJECT ?? 'all'}.log`, backendLog);
        }
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Could not capture E2E logs');
        process.exitCode = 1;
    }
}
async function teardownE2eStack(): Promise<void> {
    await stopFrontend().catch(error => {
        console.error('Error while stopping frontend:', error);
    });
    if (NO_DOCKER) {
        for (const local of localProcesses.splice(0).reverse()) {
            await local.stop().catch(error => {
                console.error('Error while stopping a local e2e process:', error);
            });
        }
        return;
    }
    await dockerCompose(['down', '-v', '--remove-orphans'], {
        ignoreExitCode: true,
    }).catch(error => {
        console.error('Error while tearing down docker compose:', error);
    });
}
async function startDockerStack(browserLabel: string): Promise<{
    adminKey: string;
    betterAuthSecret: string;
    jwks: string;
}> {
    console.log(`Resetting previous isolated Convex stack${browserLabel}...`);
    await dockerCompose(['down', '-v', '--remove-orphans'], { ignoreExitCode: true });
    console.log(`Starting isolated Convex docker compose${browserLabel}...`);
    console.log(`  - Convex backend: port ${E2E_CONVEX_PORT}`);
    console.log(`  - Convex site: port ${E2E_CONVEX_SITE_PORT}`);
    console.log(`  - Frontend: port ${E2E_FRONTEND_PORT}`);
    console.log(`  - MailDev UI: http://127.0.0.1:${E2E_MAILDEV_WEB_PORT}`);
    console.log(`  - Docker project: ${COMPOSE_PROJECT}`);
    console.log(`  - Build directory: ${E2E_NEXT_DIST_DIR}`);
    await dockerCompose(['up', '-d']);
    console.log('Waiting for Convex backend readiness...');
    await waitForConvexBackend(CONVEX_URL);
    console.log('Generating admin key from Convex backend...');
    return bootstrapConvexCredentials(dockerComposeCapture);
}
async function startLocalStack(browserLabel: string): Promise<{
    adminKey: string;
    betterAuthSecret: string;
    jwks: string;
}> {
    await assertNodeSupportedByLocalBackend();
    // Unlike `docker compose down`, nothing here may kill whatever already holds the ports.
    if (await isListening(buildUrl(CONVEX_URL, '/version'))) {
        throw new Error(`Something is already listening on ${CONVEX_URL}; stop it first.`);
    }
    const logSuffix = BROWSER_PROJECT ?? 'all';
    console.log(`Starting isolated Convex backend and MailDev without Docker${browserLabel}...`);
    console.log(`  - Convex backend: port ${E2E_CONVEX_PORT} (${E2E_CONVEX_BACKEND_VERSION})`);
    console.log(`  - Convex site: port ${E2E_CONVEX_SITE_PORT}`);
    console.log(`  - Frontend: port ${E2E_FRONTEND_PORT}`);
    console.log(`  - MailDev UI: http://127.0.0.1:${E2E_MAILDEV_WEB_PORT}`);
    console.log(`  - Build directory: ${E2E_NEXT_DIST_DIR}`);
    localProcesses.push(
        await startMailDev({
            smtpPort: E2E_MAILDEV_SMTP_PORT,
            webPort: E2E_MAILDEV_WEB_PORT,
            logFile: `reports/e2e/maildev-${logSuffix}.log`,
        })
    );
    console.log('Waiting for Convex backend readiness...');
    const backend = await startLocalBackend({
        version: E2E_CONVEX_BACKEND_VERSION,
        port: E2E_CONVEX_PORT,
        sitePort: E2E_CONVEX_SITE_PORT,
        convexUrl: CONVEX_URL,
        convexSiteUrl: CONVEX_SITE_URL,
        logFile: `reports/e2e/backend-${logSuffix}.log`,
    });
    localProcesses.push(backend);
    return { adminKey: backend.adminKey, ...(await generateAuthSecrets()) };
}
async function cleanup(mode: CleanupMode): Promise<void> {
    if (cleanupInProgress) {
        return;
    }
    cleanupInProgress = true;
    if (mode === 'failure') {
        await captureFailureLogs();
    }
    await teardownE2eStack();
    if (mode === 'success') {
        console.log('Removing e2e workspace artifacts after successful run.');
        try {
            removeE2eWorkspaceArtifacts();
        } catch (error) {
            console.error(
                error instanceof Error ? error.message : 'Could not remove E2E workspace artifacts'
            );
        }
    }
}
async function handleTermination(signal: NodeJS.Signals): Promise<void> {
    if (receivedTerminationSignal) {
        return;
    }
    receivedTerminationSignal = true;
    console.log(`\nReceived ${signal}. Cleaning up e2e stack...`);
    await cleanup('failure');
    process.exit(130);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        void handleTermination(signal);
    });
}
async function main(): Promise<void> {
    const browserLabel = BROWSER_PROJECT ? ` [${BROWSER_PROJECT}]` : '';
    const { adminKey, betterAuthSecret, jwks } = NO_DOCKER
        ? await startLocalStack(browserLabel)
        : await startDockerStack(browserLabel);
    const preferredFrontendPort = Number.parseInt(E2E_FRONTEND_PORT, 10);
    const frontendPort = String(
        await getPort({ port: portNumbers(preferredFrontendPort, preferredFrontendPort + 19) })
    );
    if (frontendPort !== E2E_FRONTEND_PORT) {
        console.log(`Frontend port ${E2E_FRONTEND_PORT} is in use, using ${frontendPort} instead.`);
    }
    const baseUrl = `http://127.0.0.1:${frontendPort}`;
    const siteUrl = baseUrl;
    const nextDistDir = E2E_NEXT_DIST_DIR;
    const setupSecret = randomBytes(32).toString('base64url');
    const commandEnv = buildConvexCommandEnv({
        deployment: { kind: 'self-hosted', adminKey },
        betterAuthSecret,
        jwks,
        convexUrl: CONVEX_URL,
        convexSiteUrl: CONVEX_SITE_URL,
        siteUrl,
        // Outside Docker the backend reaches MailDev on the host.
        ...(NO_DOCKER ? { smtp: { host: '127.0.0.1', port: E2E_MAILDEV_SMTP_PORT } } : {}),
        allowLocalHttp: true,
        extra: {
            SETUP_SECRET: setupSecret,
            BASE_URL: baseUrl,
            E2E_MAILDEV_WEB_PORT,
            NEXT_DIST_DIR: nextDistDir,
            PLAYWRIGHT_HTML_OPEN: process.env.PLAYWRIGHT_HTML_OPEN ?? 'never',
        },
    });
    console.log('Configuring Convex env vars for e2e...');
    await configureConvexEnv(commandEnv, siteUrl, { setupSecret });
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
                logFile: `reports/e2e/build-${BROWSER_PROJECT ?? 'all'}.log`,
                env: commandEnv,
            });
            writeBuildMeta(nextDistDir, buildFingerprint);
        }
    }
    console.log('Starting frontend...');
    frontendLogTail = [];
    // `next` directly: `pnpm dev` wraps `convex dev --start` and does not accept `--port`.
    const frontendCommand = E2E_FRONTEND_MODE === 'production' ? 'start' : 'dev';
    const frontend = startProcess('next', [frontendCommand, '--port', frontendPort], {
        env: commandEnv,
        output: SHOW_NEXT_LOGS ? 'inherit' : 'pipe',
    });
    frontendProcess = frontend;
    frontend.stdout?.on('data', chunk => {
        pushFrontendLogChunk('stdout', String(chunk));
    });
    frontend.stderr?.on('data', chunk => {
        pushFrontendLogChunk('stderr', String(chunk));
    });
    console.log('Waiting for frontend landing page readiness...');
    try {
        await waitForHttp(buildUrl(baseUrl, '/'), {
            timeoutMs: FRONTEND_START_TIMEOUT_MS,
            isReady: response => response.status < 500,
            process: frontend,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message}${getFrontendFailureSuffix()}`, { cause: error });
    }
    console.log(`Running Playwright e2e suite${browserLabel}...`);
    try {
        await runCommand(PNPM_COMMAND, ['exec', 'playwright', 'test', ...forwardedPlaywrightArgs], {
            logFile: `reports/e2e/playwright-${BROWSER_PROJECT ?? 'all'}.log`,
            env: commandEnv,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message}${getFrontendFailureSuffix()}`, { cause: error });
    }
    console.log(`E2E suite finished successfully${browserLabel}.`);
}
main()
    .then(async () => {
        await cleanup('success');
    })
    .catch(async error => {
        const browserLabel = BROWSER_PROJECT ? ` [${BROWSER_PROJECT}]` : '';
        console.error(`\nE2E stack execution failed${browserLabel}.`);
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        await cleanup('failure');
        process.exitCode = 1;
    });
