import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { symmetricEncrypt } from 'better-auth/crypto';
import { generateExportedKeyPair } from 'better-auth/plugins';
import { z } from 'zod';
import {
    buildUrl,
    DOCKER_COMMAND,
    type LongRunningProcess,
    PNPM_COMMAND,
    type RunCommandOptions,
    overlayEnv,
    runCommand,
    runCommandCapture,
    waitForHttp,
} from './command';

// Where the backend reaches MailDev, the local SMTP server that captures outgoing mail.
export interface SmtpCapture {
    host: string;
    port: string;
}

// Inside the compose network the backend reaches MailDev by its service name.
const DOCKER_MAILDEV_SMTP: SmtpCapture = { host: 'maildev', port: '1025' };

// MailDev requires these credentials: the compose files and `pnpm mail:local` set the same ones.
const MAILDEV_SMTP_CREDENTIALS = { user: 'maildev', password: 'maildev' } as const;

const SMTP_CAPTURE_KEYS = [
    'EMAIL_PROVIDER',
    'EMAIL_FROM',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
] as const;

function smtpCaptureEnv(capture: SmtpCapture): Record<(typeof SMTP_CAPTURE_KEYS)[number], string> {
    return {
        EMAIL_PROVIDER: 'smtp',
        EMAIL_FROM: 'Metricas <noreply@metricas.local>',
        SMTP_HOST: capture.host,
        SMTP_PORT: capture.port,
        SMTP_SECURE: 'false',
        SMTP_USER: MAILDEV_SMTP_CREDENTIALS.user,
        SMTP_PASSWORD: MAILDEV_SMTP_CREDENTIALS.password,
    };
}

const credentialsSchema = z.object({
    // Only the Docker stack has MySQL; the CLI-managed local deployment keeps its own storage.
    mysqlRootPassword: z.string().min(1).optional(),
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

export async function waitForConvexBackend(
    convexUrl: string,
    backendProcess?: LongRunningProcess
): Promise<void> {
    await waitForHttp(buildUrl(convexUrl, '/version'), { process: backendProcess });
}

export async function generateAuthSecrets(previous?: {
    betterAuthSecret?: string;
    jwks?: string;
}): Promise<{ betterAuthSecret: string; jwks: string }> {
    const betterAuthSecret = previous?.betterAuthSecret ?? randomBytes(32).toString('base64');
    const jwks = previous?.jwks ?? (await generateStaticJwks(betterAuthSecret));

    return { betterAuthSecret, jwks };
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

    return { adminKey, ...(await generateAuthSecrets(previous)) };
}

// The Convex CLI refuses to run when both selection styles are present, and it reads .env.local
// for whichever is missing from the process. An empty value counts as unset and blocks that read.
export type ConvexDeploymentTarget =
    { kind: 'self-hosted'; adminKey: string } | { kind: 'cli-local'; deploymentName: string };

function deploymentSelectionEnv(
    target: ConvexDeploymentTarget,
    convexUrl: string
): NodeJS.ProcessEnv {
    if (target.kind === 'self-hosted') {
        return {
            CONVEX_DEPLOYMENT: '',
            CONVEX_SELF_HOSTED_ADMIN_KEY: target.adminKey,
            CONVEX_SELF_HOSTED_URL: convexUrl,
        };
    }

    return {
        CONVEX_DEPLOYMENT: `anonymous:${target.deploymentName}`,
        CONVEX_SELF_HOSTED_ADMIN_KEY: '',
        CONVEX_SELF_HOSTED_URL: '',
    };
}

export function buildConvexCommandEnv(params: {
    deployment: ConvexDeploymentTarget;
    betterAuthSecret: string;
    jwks: string;
    convexUrl: string;
    convexSiteUrl: string;
    siteUrl: string;
    smtp?: SmtpCapture;
    allowLocalHttp?: boolean;
    extra?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv {
    return overlayEnv({
        ...params.extra,
        ...deploymentSelectionEnv(params.deployment, params.convexUrl),
        BETTER_AUTH_SECRET: params.betterAuthSecret,
        BETTER_AUTH_URL: params.siteUrl,
        JWKS: params.jwks,
        NEXT_PUBLIC_CONVEX_SITE_URL: params.convexSiteUrl,
        NEXT_PUBLIC_CONVEX_URL: params.convexUrl,
        ...(params.allowLocalHttp ? { NEXT_PUBLIC_E2E_ALLOW_LOCAL_HTTP: 'true' } : {}),
        NEXT_PUBLIC_SITE_URL: params.siteUrl,
        SITE_URL: params.siteUrl,
        ...smtpCaptureEnv(params.smtp ?? DOCKER_MAILDEV_SMTP),
    });
}

async function setConvexEnvVar(
    commandEnv: NodeJS.ProcessEnv,
    key: string,
    value: string
): Promise<void> {
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', key], {
        env: commandEnv,
        input: `${value}\n`,
    });
}

function convexEnvValues(
    commandEnv: NodeJS.ProcessEnv,
    siteUrl: string,
    options?: { setupSecret?: string }
): Record<string, string> {
    const values: Record<string, string | undefined> = {
        SITE_URL: siteUrl,
        BETTER_AUTH_URL: siteUrl,
        SETUP_SECRET: options?.setupSecret,
        BETTER_AUTH_SECRET: commandEnv.BETTER_AUTH_SECRET,
        JWKS: commandEnv.JWKS,
        ...Object.fromEntries(SMTP_CAPTURE_KEYS.map(key => [key, commandEnv[key]])),
    };
    return Object.fromEntries(
        Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
}

export async function configureConvexEnv(
    commandEnv: NodeJS.ProcessEnv,
    siteUrl: string,
    options?: { setupSecret?: string }
): Promise<void> {
    for (const [key, value] of Object.entries(convexEnvValues(commandEnv, siteUrl, options))) {
        await setConvexEnvVar(commandEnv, key, value);
    }
}

// Sends every variable in one `convex env set` call. A CLI-managed backend lives only as long as
// the `convex dev` that started it, and that process exits as soon as a push succeeds, so the
// variables a push depends on must not arrive one at a time.
export async function configureConvexEnvAtOnce(
    commandEnv: NodeJS.ProcessEnv,
    siteUrl: string,
    options?: { setupSecret?: string }
): Promise<void> {
    const lines = Object.entries(convexEnvValues(commandEnv, siteUrl, options)).map(
        ([key, value]) => {
            if (/['\r\n]/.test(value)) {
                throw new Error(`Cannot pass ${key} through a dotenv file`);
            }
            return `${key}='${value}'`;
        }
    );
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', '--force'], {
        env: commandEnv,
        input: `${lines.join('\n')}\n`,
    });
}

export async function deployConvexFunctions(commandEnv: NodeJS.ProcessEnv): Promise<void> {
    await preserveDeveloperEnv(() =>
        runCommand(PNPM_COMMAND, ['exec', 'convex', 'dev', '--once', '--tail-logs', 'disable'], {
            env: commandEnv,
        })
    );
}
