import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { execa, type Options, type ResultPromise } from 'execa';

export const PNPM_COMMAND = 'pnpm';
export const DOCKER_COMMAND = 'docker';

export const POLL_INTERVAL_MS = 1_000;
export const HTTP_REQUEST_TIMEOUT_MS = 3_000;
const DEFAULT_WAIT_TIMEOUT_MS = 120_000;
const PROCESS_STOP_TIMEOUT_MS = 10_000;

export interface RunCommandOptions {
    env?: NodeJS.ProcessEnv;
    input?: string;
    // Also written to this file, which is truncated first.
    logFile?: string;
    ignoreExitCode?: boolean;
}

export function overlayEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries({ ...process.env, ...overrides })) {
        if (value !== undefined) {
            env[key] = value;
        }
    }
    return env;
}

function truncatedLogFile(logFile: string): { file: string; append: true } {
    mkdirSync(dirname(logFile), { recursive: true });
    writeFileSync(logFile, '');
    // Both streams append to the same file, so neither overwrites the other.
    return { file: logFile, append: true };
}

function commandOptions(options: RunCommandOptions): Options {
    return {
        env: options.env,
        extendEnv: false,
        reject: !options.ignoreExitCode,
        ...(options.input === undefined ? { stdin: 'ignore' } : { input: options.input }),
    };
}

// Streams the output to the terminal.
export async function runCommand(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<void> {
    const log = options.logFile ? [truncatedLogFile(options.logFile)] : [];
    await execa(command, args, {
        ...commandOptions(options),
        stdout: ['inherit', ...log],
        stderr: ['inherit', ...log],
    });
}

// Returns stdout and stderr interleaved.
export async function runCommandCapture(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<string> {
    const result = await execa(command, args, { ...commandOptions(options), all: true });
    return String(result.all ?? '');
}

export type LongRunningProcess = ResultPromise;

// Starts a process that outlives the call. It is killed with `killSignal` if this script exits
// first, and `stopProcess` falls back to SIGKILL when it does not stop in time.
export function startProcess(
    command: string,
    args: Array<string>,
    options: {
        env?: NodeJS.ProcessEnv;
        killSignal?: NodeJS.Signals;
        logFile?: string;
        // `inherit` shows the output; `pipe` leaves it to the caller's listeners.
        output?: 'inherit' | 'pipe';
    } = {}
): LongRunningProcess {
    const output = options.logFile ? truncatedLogFile(options.logFile) : (options.output ?? 'pipe');
    return execa(command, args, {
        env: options.env,
        stdin: 'ignore',
        stdout: output,
        stderr: output,
        buffer: false,
        // Resolves node_modules/.bin directly, so signals reach the tool rather than a pnpm wrapper.
        preferLocal: true,
        reject: false,
        killSignal: options.killSignal ?? 'SIGTERM',
        forceKillAfterDelay: PROCESS_STOP_TIMEOUT_MS,
    });
}

function exitStatus(subprocess: LongRunningProcess): string | null {
    const { exitCode, signalCode } = subprocess.nodeChildProcess;
    return exitCode === null ? signalCode : String(exitCode);
}

export async function stopProcess(subprocess: LongRunningProcess): Promise<void> {
    if (exitStatus(subprocess) !== null) {
        return;
    }
    if (process.platform === 'win32' && subprocess.pid !== undefined) {
        // Windows signals do not reach the process tree behind a .cmd shim.
        await runCommand('taskkill.exe', ['/PID', String(subprocess.pid), '/T', '/F'], {
            ignoreExitCode: true,
        });
    } else {
        subprocess.kill();
    }
    await subprocess;
}

export function buildUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, '')}${path}`;
}

export async function fetchWithTimeout(url: string): Promise<Response> {
    return fetch(url, { signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS) });
}

export async function isListening(url: string): Promise<boolean> {
    try {
        await fetchWithTimeout(url);
        return true;
    } catch {
        return false;
    }
}

// Polls `url` until `isReady` accepts a response. Gives up early when `process` exits, since the
// service it was meant to start will never answer.
export async function waitForHttp(
    url: string,
    options: {
        timeoutMs?: number;
        isReady?: (response: Response) => boolean;
        process?: LongRunningProcess;
    } = {}
): Promise<void> {
    const { timeoutMs = DEFAULT_WAIT_TIMEOUT_MS, isReady = response => response.ok } = options;
    const start = Date.now();
    let lastAttempt = 'no response yet';

    for (let attempt = 1; Date.now() - start < timeoutMs; attempt += 1) {
        const exit = options.process ? exitStatus(options.process) : null;
        if (exit !== null) {
            throw new Error(`Process exited before ${url} was ready (exit=${exit})`);
        }
        try {
            const response = await fetchWithTimeout(url);
            if (isReady(response)) {
                return;
            }
            lastAttempt = `last status=${response.status}`;
        } catch (error) {
            lastAttempt = `last error=${error instanceof Error ? error.message : String(error)}`;
        }
        if (attempt % 5 === 0) {
            const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
            console.log(`Still waiting for ${url} (${elapsedSeconds}s elapsed, ${lastAttempt})`);
        }
        await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(`Timed out waiting for ${url} (${lastAttempt})`);
}
