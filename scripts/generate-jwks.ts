import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { buildStackEnvironment } from './lib/stack-environment';
import {
    PNPM_COMMAND,
    USE_SHELL_FOR_PNPM,
    redactSensitiveText,
    registerSensitiveValues,
    runCommandCapture,
    runCommandWithInput,
} from './lib/command';

async function main() {
    const local = parseEnv(readFileSync('.env.local', 'utf8'));
    const url = process.env.CONVEX_SELF_HOSTED_URL ?? local.CONVEX_SELF_HOSTED_URL;
    const key = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? local.CONVEX_SELF_HOSTED_ADMIN_KEY;
    if (!url || !key) throw new Error('Configure the local Convex stack before generating JWKS');
    const env = buildStackEnvironment({
        mode: 'local',
        overrides: { CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: key },
    });
    const raw = await runCommandCapture(
        PNPM_COMMAND,
        ['exec', 'convex', 'run', 'generated/auth:getLatestJwks'],
        { env, shell: USE_SHELL_FOR_PNPM }
    );
    registerSensitiveValues([raw.trim()]);
    const decoded: unknown = JSON.parse(raw);
    const value: unknown = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
    z.array(z.object({ publicKey: z.string(), privateKey: z.string() }))
        .min(1)
        .parse(value);
    const serialized = JSON.stringify(value);
    registerSensitiveValues([serialized]);
    await runCommandWithInput(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'JWKS'], serialized, {
        env,
        shell: USE_SHELL_FOR_PNPM,
    });
    console.log('Local JWKS updated');
}

main().catch(error => {
    console.error(
        redactSensitiveText(error instanceof Error ? error.message : 'JWKS update failed')
    );
    process.exitCode = 1;
});
