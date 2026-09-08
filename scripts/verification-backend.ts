import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { buildStackEnvironment, processEnvironment } from './lib/stack-environment';
import { preserveDeveloperEnv } from './lib/preserve-env';
import {
    bootstrapConvexCredentials,
    buildConvexCommandEnv,
    configureConvexEnv,
    createDockerComposeHelpers,
    waitForConvexBackend,
} from './lib/convex-stack';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, redactSensitiveText, runCommand } from './lib/command';

const envFile = '.local-stack/verification.json';
const convexUrl = 'http://127.0.0.1:5210';
const siteUrl = 'http://127.0.0.1:5211';
const { dockerCompose, dockerComposeCapture } = createDockerComposeHelpers({
    composeFile: 'infrastructure/docker-compose.e2e.yml',
    projectName: 'metricas-verification',
    getComposeEnv: () =>
        buildStackEnvironment({
            mode: 'e2e',
            overrides: {
                PORT: '5210',
                SITE_PROXY_PORT: '5211',
                MAILHOG_SMTP_PORT: '5025',
                MAILHOG_UI_PORT: '5026',
            },
        }),
});

async function main() {
    const [operation = 'start', ...args] = process.argv.slice(2);
    if (operation === 'stop') {
        await dockerCompose(['down', '-v', '--remove-orphans']);
        return;
    }
    if (operation === 'pause') {
        await dockerCompose(['down', '--remove-orphans']);
        return;
    }
    if (operation === 'start') {
        await dockerCompose(['up', '-d']);
        await waitForConvexBackend(convexUrl);
        const previous = existsSync(envFile)
            ? z.record(z.string(), z.string()).parse(JSON.parse(readFileSync(envFile, 'utf8')))
            : undefined;
        const credentials = await bootstrapConvexCredentials(dockerComposeCapture, {
            betterAuthSecret: previous?.BETTER_AUTH_SECRET,
            jwks: previous?.JWKS,
        });
        const e2eSetupSecret = previous?.E2E_SETUP_SECRET ?? randomBytes(32).toString('base64url');
        const setupSecret = previous?.SETUP_SECRET ?? randomBytes(32).toString('base64url');
        const env = buildConvexCommandEnv({
            ...credentials,
            convexUrl,
            convexSiteUrl: siteUrl,
            siteUrl: 'http://127.0.0.1:5300',
            allowLocalHttp: true,
            extra: { E2E_SETUP_SECRET: e2eSetupSecret, SETUP_SECRET: setupSecret },
        });
        await configureConvexEnv(env, 'http://127.0.0.1:5300', { e2eSetupSecret, setupSecret });
        mkdirSync('.local-stack', { recursive: true });
        writeFileSync(envFile, JSON.stringify(env), { mode: 0o600 });
        console.log('Verification backend ready on loopback port 5210');
        return;
    }
    if (!['codegen', 'dev', 'run', 'export', 'import', 'data'].includes(operation))
        throw new Error('Unsupported verification command');
    if (
        args.some(arg =>
            /^--(?:url|admin-key|prod|deployment(?:-name)?|env-file|preview-name|configure|team|project)(?:=|$)/.test(
                arg
            )
        )
    )
        throw new Error('Verification commands cannot override their local deployment');
    const saved = z.record(z.string(), z.string()).parse(JSON.parse(readFileSync(envFile, 'utf8')));
    const env = {
        ...buildStackEnvironment({ mode: 'local', overrides: saved }),
        ...processEnvironment(),
    };
    if (env.CONVEX_SELF_HOSTED_URL !== convexUrl)
        throw new Error('Verification backend URL changed');
    await preserveDeveloperEnv(() =>
        runCommand(PNPM_COMMAND, ['exec', 'convex', operation, ...args], {
            env,
            shell: USE_SHELL_FOR_PNPM,
        })
    );
}

main().catch(error => {
    console.error(
        redactSensitiveText(error instanceof Error ? error.message : 'Verification backend failed')
    );
    process.exitCode = 1;
});
