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
    sanitizeEnv,
} from './command';
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
    dockerComposeCapture: (args: Array<string>) => Promise<string>
): Promise<{ adminKey: string; betterAuthSecret: string; jwks: string }> {
    const adminKeyOutput = await dockerComposeCapture([
        'exec',
        '-T',
        'backend',
        './generate_admin_key.sh',
    ]);
    const adminKey = extractAdminKey(adminKeyOutput);
    const betterAuthSecret = randomBytes(32).toString('base64');
    const jwks = await generateStaticJwks(betterAuthSecret);

    return { adminKey, betterAuthSecret, jwks };
}

export function buildConvexCommandEnv(params: {
    adminKey: string;
    betterAuthSecret: string;
    jwks: string;
    convexUrl: string;
    convexSiteUrl: string;
    siteUrl: string;
    extra?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv {
    return buildMailhogConvexEnv({
        ...sanitizeEnv(process.env),
        ...params.extra,
        BETTER_AUTH_SECRET: params.betterAuthSecret,
        BETTER_AUTH_URL: params.siteUrl,
        CONVEX_SELF_HOSTED_ADMIN_KEY: params.adminKey,
        CONVEX_SELF_HOSTED_URL: params.convexUrl,
        JWKS: params.jwks,
        NEXT_PUBLIC_CONVEX_SITE_URL: params.convexSiteUrl,
        NEXT_PUBLIC_CONVEX_URL: params.convexUrl,
        NEXT_PUBLIC_SITE_URL: params.siteUrl,
        SITE_URL: params.siteUrl,
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
    options?: { e2eSetupSecret?: string }
): Promise<void> {
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'SITE_URL', siteUrl], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'BETTER_AUTH_URL', siteUrl], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });

    if (options?.e2eSetupSecret !== undefined) {
        await runCommand(
            PNPM_COMMAND,
            ['exec', 'convex', 'env', 'set', 'E2E_SETUP_SECRET', options.e2eSetupSecret],
            {
                env: commandEnv,
                shell: USE_SHELL_FOR_PNPM,
            }
        );
    }

    await runCommand(
        PNPM_COMMAND,
        ['exec', 'convex', 'env', 'set', 'BETTER_AUTH_SECRET', commandEnv.BETTER_AUTH_SECRET ?? ''],
        {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        }
    );
    await runCommandWithInput(
        PNPM_COMMAND,
        ['exec', 'convex', 'env', 'set', 'JWKS'],
        `${commandEnv.JWKS ?? ''}\n`,
        {
            env: commandEnv,
            shell: USE_SHELL_FOR_PNPM,
        }
    );

    for (const [key, value] of Object.entries(DEFAULT_MAILHOG_SMTP_ENV)) {
        await setConvexEnvVar(commandEnv, key, value);
    }
}

export async function deployConvexFunctions(commandEnv: NodeJS.ProcessEnv): Promise<void> {
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'dev', '--once', '--tail-logs', 'disable'], {
        env: commandEnv,
        shell: USE_SHELL_FOR_PNPM,
    });
}
