import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import process from 'node:process';
import { processEnvironment } from './stack-environment';
import { installedNodeTool } from './node-tool';

const nativePnpm =
    process.platform === 'win32'
        ? (process.env.PATH ?? '')
              .split(delimiter)
              .map(directory => join(directory, 'pnpm.exe'))
              .find(candidate => existsSync(candidate))
        : undefined;
export const PNPM_COMMAND = nativePnpm ?? 'pnpm';
export const DOCKER_COMMAND = process.platform === 'win32' ? 'docker.exe' : 'docker';
export const USE_SHELL_FOR_PNPM = process.platform === 'win32' && !nativePnpm;

export interface RunCommandOptions extends SpawnOptionsWithoutStdio {
    ignoreExitCode?: boolean;
    sensitiveValues?: readonly string[];
    logFile?: string;
}

const secretValues = new Set<string>();

export function registerSensitiveValues(values: readonly (string | undefined)[]): void {
    for (const value of values) {
        if (value && value.length >= 4) secretValues.add(value);
    }
}

export function redactSensitiveText(text: string, values: readonly string[] = []): string {
    let result = text;
    const secrets = [...secretValues, ...values]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    for (const secret of secrets) result = result.split(secret).join('[REDACTED]');
    return result
        .replace(/convex-self-hosted\|[^\s'"`]+/g, '[REDACTED_ADMIN_KEY]')
        .replace(/(mysql|postgres(?:ql)?):\/\/[^\s@]+@/gi, '$1://[REDACTED]@')
        .replace(
            /((?:SECRET|PASSWORD|TOKEN|ADMIN_KEY|DEPLOY_KEY)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi,
            '$1"[REDACTED]"'
        )
        .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]')
        .replace(
            /((?:set-cookie|cookie)["']?\s*:\s*)(?:"[^"]*"|'[^']*'|[^\r\n]+)/gi,
            '$1"[REDACTED]"'
        );
}

export function formatCommand(command: string, args: Array<string>): string {
    return redactSensitiveText([command, ...args].join(' '));
}

function registerEnvironmentSecrets(env: NodeJS.ProcessEnv): void {
    registerSensitiveValues(
        Object.entries(env)
            .filter(([key]) => /SECRET|PASSWORD|TOKEN|KEY|JWKS/.test(key))
            .map(([, value]) => value)
    );
}

function lineWriter(write: (text: string) => void) {
    let pending = '';
    return {
        append(chunk: Buffer | string) {
            pending += String(chunk);
            const end = pending.lastIndexOf('\n');
            if (end >= 0) {
                write(redactSensitiveText(pending.slice(0, end + 1)));
                pending = pending.slice(end + 1);
            }
        },
        flush() {
            if (pending) write(redactSensitiveText(pending));
            pending = '';
        },
    };
}

function execute(
    command: string,
    args: Array<string>,
    options: RunCommandOptions,
    input: string | undefined,
    capture: boolean
): Promise<string> {
    const { ignoreExitCode = false, sensitiveValues = [], logFile, ...spawnOptions } = options;
    let env = { ...(spawnOptions.env ?? processEnvironment()) };
    const installed = command === PNPM_COMMAND ? installedNodeTool(args) : null;
    if (installed) {
        const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
        const previousPath = pathKey ? env[pathKey] : undefined;
        if (pathKey && pathKey !== 'PATH') {
            env = Object.fromEntries(Object.entries(env).filter(([key]) => key !== pathKey));
        }
        env.PATH = [join(process.cwd(), 'node_modules', '.bin'), previousPath ?? ''].join(
            delimiter
        );
    }
    registerEnvironmentSecrets(env);
    registerSensitiveValues(sensitiveValues);
    const inputName = args.at(-1) ?? '';
    if (input && /SECRET|PASSWORD|TOKEN|KEY|JWKS/.test(inputName)) {
        registerSensitiveValues([input.trim()]);
    }
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
        const child = spawn(installed?.command ?? command, installed?.args ?? args, {
            cwd: process.cwd(),
            shell: false,
            ...spawnOptions,
            ...(installed ? { shell: false } : {}),
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let output = '';
        const stdout = lineWriter(text => record(text, process.stdout));
        const stderr = lineWriter(text => record(text, process.stderr));
        child.stdout.on('data', (chunk: Buffer) => {
            output += String(chunk);
            stdout.append(chunk);
        });
        child.stderr.on('data', (chunk: Buffer) => {
            output += String(chunk);
            stderr.append(chunk);
        });
        child.stdin.on('error', () => {
            /* Exit status reports a closed input pipe. */
        });
        child.stdin.end(input);
        child.on('error', error => reject(new Error(redactSensitiveText(error.message))));
        child.on('close', (code, signal) => {
            stdout.flush();
            stderr.flush();
            if (code === 0 || ignoreExitCode) {
                resolve(output);
            } else {
                reject(
                    new Error(
                        redactSensitiveText(
                            `Command failed (${formatCommand(command, args)}), exit=${code ?? 'unknown'}, signal=${signal ?? 'none'}\n${output}`
                        )
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
