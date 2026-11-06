import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { execa } from 'execa';
import { z } from 'zod';
import { PNPM_COMMAND, overlayEnv, runCommand } from './lib/command';

async function main() {
    const local = parseEnv(readFileSync('.env.local', 'utf8'));
    const url = process.env.CONVEX_SELF_HOSTED_URL ?? local.CONVEX_SELF_HOSTED_URL;
    const key = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? local.CONVEX_SELF_HOSTED_ADMIN_KEY;

    const deployment = process.env.CONVEX_DEPLOYMENT ?? local.CONVEX_DEPLOYMENT;

    // The Docker stack is self-hosted; without Docker the Convex CLI resolves CONVEX_DEPLOYMENT.
    if (!(url && key) && !deployment) {
        throw new Error('Configure the local Convex stack before generating JWKS');
    }

    const env = overlayEnv(
        url && key ? { CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: key } : {}
    );

    // On Windows the Convex CLI can abort with a libuv assertion after printing the result, so
    // the exit code is ignored and the printed value is validated instead.
    const result = await execa(PNPM_COMMAND, ['exec', 'convex', 'run', 'auth:getLatestJwks'], {
        env,
        extendEnv: false,
        reject: false,
        stdin: 'ignore',
    });

    const raw = result.stdout.trim();

    if (!raw) {
        throw new Error(result.stderr || 'Could not read the JWKS from the deployment');
    }

    const jwks = z.array(z.looseObject({ publicKey: z.string(), privateKey: z.string() })).min(1);

    const value = z
        .union([jwks, z.string().transform(text => jwks.parse(JSON.parse(text)))])
        .parse(JSON.parse(raw));

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
