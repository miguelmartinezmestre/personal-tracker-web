import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import process from 'node:process';

export const PNPM_COMMAND = 'pnpm';
export const DOCKER_COMMAND = 'docker';

export interface RunCommandOptions extends SpawnOptions {
    ignoreExitCode?: boolean;
    logFile?: string;
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

function formatCommand(command: string, args: Array<string>): string {
    return [command, ...args].join(' ');
}

function lineWriter(write: (text: string) => void) {
    let pending = '';
    return {
        append(chunk: Buffer | string) {
            pending += String(chunk);
            const end = pending.lastIndexOf('\n');
            if (end >= 0) {
                write(pending.slice(0, end + 1));
                pending = pending.slice(end + 1);
            }
        },
        flush() {
            if (pending) write(pending);
            pending = '';
        },
    };
}

export function spawnCommand(
    command: string,
    args: Array<string>,
    options: SpawnOptions = {}
): ChildProcess {
    const { env, ...rest } = options;
    return spawn(command, args, {
        cwd: process.cwd(),
        shell: process.platform === 'win32',
        ...rest,
        env: overlayEnv(env),
    });
}

function execute(
    command: string,
    args: Array<string>,
    options: RunCommandOptions,
    input: string | undefined,
    capture: boolean
): Promise<string> {
    const { ignoreExitCode = false, logFile, ...spawnOptions } = options;
    if (logFile) {
        mkdirSync(dirname(logFile), { recursive: true });
        writeFileSync(logFile, '');
    }
    const record = (text: string, stream: NodeJS.WriteStream) => {
        if (logFile) {
            appendFileSync(logFile, text);
        }
        if (!capture) {
            stream.write(text);
        }
    };

    return new Promise((resolve, reject) => {
        const child = spawnCommand(command, args, {
            ...spawnOptions,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let output = '';
        const stdout = lineWriter(text => record(text, process.stdout));
        const stderr = lineWriter(text => record(text, process.stderr));
        child.stdout?.on('data', (chunk: Buffer) => {
            output += String(chunk);
            stdout.append(chunk);
        });
        child.stderr?.on('data', (chunk: Buffer) => {
            output += String(chunk);
            stderr.append(chunk);
        });
        child.stdin?.on('error', () => {
            /* Exit status reports a closed input pipe. */
        });
        child.stdin?.end(input);
        child.on('error', error => reject(error));
        child.on('close', (code, signal) => {
            stdout.flush();
            stderr.flush();
            if (code === 0 || ignoreExitCode) {
                resolve(output);
            } else {
                reject(
                    new Error(
                        `Command failed (${formatCommand(command, args)}), exit=${code ?? 'unknown'}, signal=${signal ?? 'none'}\n${output}`
                    )
                );
            }
        });
    });
}

export async function runCommand(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<void> {
    await execute(command, args, options, undefined, false);
}

export async function runCommandWithInput(
    command: string,
    args: Array<string>,
    input: string,
    options: RunCommandOptions = {}
): Promise<void> {
    await execute(command, args, options, input, false);
}

export function runCommandCapture(
    command: string,
    args: Array<string>,
    options: RunCommandOptions = {}
): Promise<string> {
    return execute(command, args, options, undefined, true);
}
