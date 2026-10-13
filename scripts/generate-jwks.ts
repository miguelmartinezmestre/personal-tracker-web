import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { PNPM_COMMAND, overlayEnv, runCommand, runCommandCapture } from './lib/command';

async function main() {
    const local = parseEnv(readFileSync('.env.local', 'utf8'));
    const url = process.env.CONVEX_SELF_HOSTED_URL ?? local.CONVEX_SELF_HOSTED_URL;
    const key = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? local.CONVEX_SELF_HOSTED_ADMIN_KEY;
    if (!url || !key) throw new Error('Configure the local Convex stack before generating JWKS');
    const env = overlayEnv({ CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: key });
    const raw = await runCommandCapture(
        PNPM_COMMAND,
        ['exec', 'convex', 'run', 'generated/auth:getLatestJwks'],
        { env }
    );
    const decoded: unknown = JSON.parse(raw);
    const value: unknown = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
    z.array(z.object({ publicKey: z.string(), privateKey: z.string() }))
        .min(1)
        .parse(value);
    const serialized = JSON.stringify(value);
    await runCommand(PNPM_COMMAND, ['exec', 'convex', 'env', 'set', 'JWKS'], {
        env,
        input: serialized,
    });
    console.log('Local JWKS updated');
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'JWKS update failed');
    process.exitCode = 1;
});
