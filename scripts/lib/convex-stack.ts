import { preserveDeveloperEnv } from './preserve-env';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { extractAdminKey, generateStaticJwks } from './auth';
import {
    DOCKER_COMMAND,
    PNPM_COMMAND,
    type RunCommandOptions,
    USE_SHELL_FOR_PNPM,
    runCommand,
    runCommandCapture,
    runCommandWithInput,
    registerSensitiveValues,
} from './command';
import { buildStackEnvironment } from './stack-environment';
import { buildUrl, waitForHttp } from './http';
import { DEFAULT_MAILHOG_SMTP_ENV, buildMailhogConvexEnv } from './mailhog-email';

export const CONVEX_START_TIMEOUT_MS = 120_000;
export const POLL_INTERVAL_MS = 1_000;
export const HTTP_REQUEST_TIMEOUT_MS = 3_000;

export function createDockerComposeHelpers(config: {
    composeFile: string;
    projectName?: string;
    getComposeEnv: (extra?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
}): {
    dockerCompose: (args: Array<string>, options?: RunCommandOptions) => Promise<void>;
    dockerComposeCapture: (args: Array<string>, options?: RunCommandOptions) => Promise<string>;
} {
    function composeArgs(args: Array<string>): Array<string> {
        const directory = join(process.cwd(), '.local-stack');
        mkdirSync(directory, { recursive: true });
        const emptyEnvFile = join(directory, 'compose.empty.env');
        writeFileSync(emptyEnvFile, '');
        const base = ['compose', '--env-file', emptyEnvFile, '-f', config.composeFile];
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
    registerSensitiveValues([adminKey, betterAuthSecret, jwks]);

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
    return buildStackEnvironment({
        mode: params.allowLocalHttp ? 'e2e' : 'local',
        overrides: buildMailhogConvexEnv({
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
        }),
    });
}

export async function setConvexEnvVar(
    commandEnv: NodeJS.ProcessEnv,
    key: string,
    value: string
): Promise<void> {
    await runCommandWithInput(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', key], `${value}\n`, {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
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
            shell: USE_SHELL_FOR_PNPM,
        })
    );
}
