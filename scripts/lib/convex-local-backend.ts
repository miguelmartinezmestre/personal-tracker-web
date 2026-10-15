import { randomBytes } from 'node:crypto';
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import {
    buildUrl,
    runCommand,
    runCommandCapture,
    startProcess,
    stopProcess,
    waitForHttp,
} from './command';
import { waitForConvexBackend } from './convex-stack';

// Runs Convex and MailDev as plain processes, without Docker. The backend binary is the one the
// Convex CLI uses for local deployments, kept in the same cache so both share downloads.

// Node versions the local backend accepts for "use node" actions.
const LOCAL_BACKEND_NODE_MAJORS = [20, 22, 24];
// Same instance name as the Docker image, so admin keys look the same in both stacks.
const INSTANCE_NAME = 'convex-self-hosted';

export const UNSUPPORTED_NODE_MESSAGE =
    'The local Convex backend runs "use node" actions with the node on PATH. ' +
    `It needs Node ${LOCAL_BACKEND_NODE_MAJORS.join(', ')}; run \`nvm use\` (.nvmrc) and retry.`;

export async function isNodeSupportedByLocalBackend(): Promise<boolean> {
    const version = (await runCommandCapture('node', ['--version'])).trim();
    return LOCAL_BACKEND_NODE_MAJORS.includes(Number.parseInt(version.replace(/^v/, ''), 10));
}

function convexCacheDir(): string {
    if (process.platform === 'win32') {
        return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'convex');
    }
    return join(homedir(), '.cache', 'convex');
}

function backendReleaseAsset(): string {
    const assets: Record<string, string | undefined> = {
        'darwin-arm64': 'convex-local-backend-aarch64-apple-darwin.zip',
        'darwin-x64': 'convex-local-backend-x86_64-apple-darwin.zip',
        'linux-arm64': 'convex-local-backend-aarch64-unknown-linux-gnu.zip',
        'linux-x64': 'convex-local-backend-x86_64-unknown-linux-gnu.zip',
        'win32-x64': 'convex-local-backend-x86_64-pc-windows-msvc.zip',
    };
    const asset = assets[`${process.platform}-${process.arch}`];
    if (!asset) {
        throw new Error(`No Convex backend binary for ${process.platform}/${process.arch}`);
    }
    return asset;
}

export async function ensureLocalBackendBinary(version: string): Promise<string> {
    const executable =
        process.platform === 'win32' ? 'convex-local-backend.exe' : 'convex-local-backend';
    const binaryPath = join(convexCacheDir(), 'binaries', version, executable);
    if (existsSync(binaryPath)) {
        return binaryPath;
    }

    const url = `https://github.com/get-convex/convex-backend/releases/download/${version}/${backendReleaseAsset()}`;
    console.log(`Downloading Convex backend ${version}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not download the Convex backend from ${url} (${response.status})`);
    }
    const workDirectory = mkdtempSync(join(tmpdir(), 'convex-backend-download-'));
    try {
        const zipPath = join(workDirectory, 'backend.zip');
        writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
        const extractDirectory = join(workDirectory, 'extracted');
        mkdirSync(extractDirectory);
        if (process.platform === 'win32') {
            await runCommand('tar', ['-xf', zipPath, '-C', extractDirectory]);
        } else {
            await runCommand('unzip', ['-o', '-q', zipPath, '-d', extractDirectory]);
        }
        const extracted = join(extractDirectory, executable);
        chmodSync(extracted, 0o755);
        mkdirSync(dirname(binaryPath), { recursive: true });
        renameSync(extracted, binaryPath);
    } finally {
        rmSync(workDirectory, { recursive: true, force: true });
    }
    return binaryPath;
}

export interface LocalProcess {
    stop: () => Promise<void>;
}

// An isolated, throwaway backend: SQLite and file storage live in a temporary directory that
// `stop` deletes, so nothing is shared with the developer's local deployment.
export async function startLocalBackend(options: {
    version: string;
    port: string;
    sitePort: string;
    convexUrl: string;
    convexSiteUrl: string;
    logFile: string;
}): Promise<LocalProcess & { adminKey: string }> {
    const binaryPath = await ensureLocalBackendBinary(options.version);
    const instanceSecret = randomBytes(32).toString('hex');
    const adminKey = (
        await runCommandCapture(binaryPath, [
            'keygen',
            'admin-key',
            '--instance-name',
            INSTANCE_NAME,
            '--instance-secret',
            instanceSecret,
        ])
    ).trim();

    const dataDirectory = mkdtempSync(join(tmpdir(), 'metricas-e2e-backend-'));
    const backend = startProcess(
        binaryPath,
        [
            '--interface',
            '127.0.0.1',
            '--port',
            options.port,
            '--site-proxy-port',
            options.sitePort,
            '--convex-origin',
            options.convexUrl,
            '--convex-site',
            options.convexSiteUrl,
            '--instance-name',
            INSTANCE_NAME,
            '--instance-secret',
            instanceSecret,
            '--local-storage',
            join(dataDirectory, 'storage'),
            '--disable-beacon',
            '--redact-logs-to-client',
            join(dataDirectory, 'backend.sqlite3'),
        ],
        // SIGINT is the backend's graceful shutdown, as in the compose files.
        { env: { RUST_LOG: 'info' }, killSignal: 'SIGINT', logFile: options.logFile }
    );
    const stop = async () => {
        await stopProcess(backend);
        rmSync(dataDirectory, { recursive: true, force: true });
    };

    try {
        await waitForConvexBackend(options.convexUrl, backend);
    } catch (error) {
        await stop();
        throw error;
    }
    return { adminKey, stop };
}

export async function startMailDev(options: {
    smtpPort: string;
    webPort: string;
    logFile: string;
}): Promise<LocalProcess> {
    const maildev = startProcess(
        'maildev',
        [
            '--ip',
            '127.0.0.1',
            '--web-ip',
            '127.0.0.1',
            '--smtp',
            options.smtpPort,
            '--web',
            options.webPort,
            '--incoming-user',
            'maildev',
            '--incoming-pass',
            'maildev',
        ],
        { logFile: options.logFile }
    );
    const stop = () => stopProcess(maildev);

    try {
        await waitForHttp(buildUrl(`http://127.0.0.1:${options.webPort}`, '/api/healthz'), {
            process: maildev,
        });
    } catch (error) {
        await stop();
        throw error;
    }
    return { stop };
}
