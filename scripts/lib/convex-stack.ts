import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { symmetricEncrypt } from 'better-auth/crypto';
import { generateExportedKeyPair } from 'better-auth/plugins';
import { z } from 'zod';
import {
    DOCKER_COMMAND,
    PNPM_COMMAND,
    type RunCommandOptions,
    overlayEnv,
    runCommand,
    runCommandCapture,
    runCommandWithInput,
} from './command';

export const CONVEX_START_TIMEOUT_MS = 120_000;
export const POLL_INTERVAL_MS = 1_000;
export const HTTP_REQUEST_TIMEOUT_MS = 3_000;

const DEFAULT_MAILHOG_SMTP_ENV = {
    EMAIL_PROVIDER: 'smtp',
    EMAIL_FROM: 'Metricas <noreply@metricas.local>',
    SMTP_HOST: 'mailhog',
    SMTP_PORT: '1025',
    SMTP_SECURE: 'false',
    SMTP_USER: 'mailhog',
    SMTP_PASSWORD: 'mailhog',
} as const;

const credentialsSchema = z.object({
    mysqlRootPassword: z.string().min(1),
    betterAuthSecret: z.string().min(1).optional(),
    jwks: z.string().min(1).optional(),
});

export type LocalStackCredentials = z.infer<typeof credentialsSchema>;

export function readLocalStackCredentials(root: string): LocalStackCredentials | undefined {
    const path = join(root, '.local-stack', 'credentials.json');
    if (!existsSync(path)) return undefined;
    try {
        return credentialsSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    } catch {
        throw new Error(
            'Invalid local stack credentials file; preserve it before repairing local configuration'
        );
    }
}

export function writeLocalStackCredentials(root: string, credentials: LocalStackCredentials): void {
    const directory = join(root, '.local-stack');
    mkdirSync(directory, { recursive: true });
    writeFileSync(
        join(directory, 'credentials.json'),
        JSON.stringify(credentialsSchema.parse(credentials)),
        { mode: 0o600 }
    );
}

export function buildUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, '')}${path}`;
}

export function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        abortController.abort();
    }, timeoutMs);

    try {
        return await fetch(url, {
            signal: abortController.signal,
        });
    } catch (error) {
        if (abortController.signal.aborted) {
            throw new Error(`Request timeout after ${timeoutMs}ms`, { cause: error });
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function waitForHttp({
    url,
    timeoutMs,
    requestTimeoutMs,
    pollIntervalMs,
    isReady,
}: {
    url: string;
    timeoutMs: number;
    requestTimeoutMs: number;
    pollIntervalMs: number;
    isReady: (response: Response) => boolean;
}): Promise<void> {
    const start = Date.now();
    let lastStatus: number | null = null;
    let lastError: string | null = null;
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        attempts += 1;

        try {
            const response = await fetchWithTimeout(url, requestTimeoutMs);
            lastStatus = response.status;

            if (isReady(response)) {
                return;
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }

        if (attempts % 5 === 0) {
            const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
            let progressHint: string;
            if (lastStatus !== null) {
                progressHint = `last status=${lastStatus}`;
            } else {
                progressHint = `last error=${lastError ?? 'unknown'}`;
            }
            console.log(`Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`);
        }

        await sleep(pollIntervalMs);
    }

    const statusMessage =
        lastStatus !== null ? `last status=${lastStatus}` : `last error=${lastError ?? 'unknown'}`;
    throw new Error(`Timed out waiting for ${url} (${statusMessage})`);
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

        result += value.charAt(index);
        index += 1;
    }

    return result;
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
        throw new Error('Could not extract the local Convex admin key');
    }

    return match[0];
}

async function preserveDeveloperEnv<T>(operation: () => Promise<T>): Promise<T> {
    const files = ['.env', '.env.local'].map(name => {
        const path = resolve(name);
        if (existsSync(path) && !lstatSync(path).isFile()) {
            throw new Error(`Expected a regular local environment file: ${name}`);
        }
        return { path, before: existsSync(path) ? readFileSync(path) : null };
    });
    try {
        return await operation();
    } finally {
        for (const file of files) {
            if (file.before !== null) {
                writeFileSync(file.path, file.before);
            } else if (existsSync(file.path)) {
                unlinkSync(file.path);
            }
        }
    }
}

export function createDockerComposeHelpers(config: {
    composeFile: string;
    projectName?: string;
    getComposeEnv: (extra?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
}): {
    dockerCompose: (args: Array<string>, options?: RunCommandOptions) => Promise<void>;
    dockerComposeCapture: (args: Array<string>, options?: RunCommandOptions) => Promise<string>;
} {
    function composeArgs(args: Array<string>): Array<string> {
        const base = ['compose', '-f', config.composeFile];
        if (config.projectName) {
            base.push('-p', config.projectName);
        }

        return [...base, ...args];
    }

    function dockerCompose(args: Array<string>, options: RunCommandOptions = {}): Promise<void> {
        return runCommand(DOCKER_COMMAND, composeArgs(args), {
            ...options,
            env: config.getComposeEnv(options.env),
        });
    }

    function dockerComposeCapture(
        args: Array<string>,
        options: RunCommandOptions = {}
    ): Promise<string> {
        return runCommandCapture(DOCKER_COMMAND, composeArgs(args), {
            ...options,
            env: config.getComposeEnv(options.env),
        });
    }

    return { dockerCompose, dockerComposeCapture };
}

export async function waitForConvexBackend(convexUrl: string): Promise<void> {
    await waitForHttp({
        url: buildUrl(convexUrl, '/version'),
        timeoutMs: CONVEX_START_TIMEOUT_MS,
        requestTimeoutMs: HTTP_REQUEST_TIMEOUT_MS,
        pollIntervalMs: POLL_INTERVAL_MS,
        isReady: response => response.ok,
    });
}

export async function bootstrapConvexCredentials(
    dockerComposeCapture: (args: Array<string>) => Promise<string>,
    previous?: { betterAuthSecret?: string; jwks?: string }
): Promise<{ adminKey: string; betterAuthSecret: string; jwks: string }> {
    const adminKeyOutput = await dockerComposeCapture([
        'exec',
        '-T',
        'backend',
        './generate_admin_key.sh',
    ]);
    const adminKey = extractAdminKey(adminKeyOutput);
    const betterAuthSecret = previous?.betterAuthSecret ?? randomBytes(32).toString('base64');
    const jwks = previous?.jwks ?? (await generateStaticJwks(betterAuthSecret));

    return { adminKey, betterAuthSecret, jwks };
}

export function buildConvexCommandEnv(params: {
    adminKey: string;
    betterAuthSecret: string;
    jwks: string;
    convexUrl: string;
    convexSiteUrl: string;
    siteUrl: string;
    allowLocalHttp?: boolean;
    extra?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv {
    return overlayEnv({
        ...params.extra,
        BETTER_AUTH_SECRET: params.betterAuthSecret,
        BETTER_AUTH_URL: params.siteUrl,
        CONVEX_SELF_HOSTED_ADMIN_KEY: params.adminKey,
        CONVEX_SELF_HOSTED_URL: params.convexUrl,
        JWKS: params.jwks,
        NEXT_PUBLIC_CONVEX_SITE_URL: params.convexSiteUrl,
        NEXT_PUBLIC_CONVEX_URL: params.convexUrl,
        ...(params.allowLocalHttp ? { NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP: 'true' } : {}),
        NEXT_PUBLIC_SITE_URL: params.siteUrl,
        SITE_URL: params.siteUrl,
        ...DEFAULT_MAILHOG_SMTP_ENV,
    });
}

async function setConvexEnvVar(
    commandEnv: NodeJS.ProcessEnv,
    key: string,
    value: string
): Promise<void> {
    await runCommandWithInput(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', key], `${value}\n`, {
        env: commandEnv,
    });
}

export async function configureConvexEnv(
    commandEnv: NodeJS.ProcessEnv,
    siteUrl: string,
    options?: { e2eSetupSecret?: string; setupSecret?: string }
): Promise<void> {
    const values: Record<string, string | undefined> = {
        SITE_URL: siteUrl,
        BETTER_AUTH_URL: siteUrl,
        E2E_SETUP_SECRET: options?.e2eSetupSecret,
        SETUP_SECRET: options?.setupSecret,
        BETTER_AUTH_SECRET: commandEnv.BETTER_AUTH_SECRET,
        JWKS: commandEnv.JWKS,
        ...DEFAULT_MAILHOG_SMTP_ENV,
    };
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) await setConvexEnvVar(commandEnv, key, value);
    }
}

export async function deployConvexFunctions(commandEnv: NodeJS.ProcessEnv): Promise<void> {
    await preserveDeveloperEnv(() =>
        runCommand(PNPM_COMMAND, ['exec', 'convex', 'dev', '--once', '--tail-logs', 'disable'], {
            env: commandEnv,
        })
    );
}
