import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import process from 'node:process';

export const PNPM_COMMAND = 'pnpm';
export const DOCKER_COMMAND = process.platform === 'win32' ? 'docker.exe' : 'docker';
export const USE_SHELL_FOR_PNPM = process.platform === 'win32';

export interface RunCommandOptions extends SpawnOptionsWithoutStdio {
    ignoreExitCode?: boolean;
}

export function formatCommand(command: string, args: Array<string>): string {
    return [command, ...args].join(' ');
}

export function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
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

export function runCommand(
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

export function runCommandWithInput(
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

export function runCommandCapture(
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
