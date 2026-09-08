import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isRecord } from '../../shared/boundary-values';

const packages: Record<string, string> = {
    tsx: 'tsx',
    tsc: 'typescript',
    next: 'next',
    convex: 'convex',
    vitest: 'vitest',
    prettier: 'prettier',
    knip: 'knip',
    playwright: '@playwright/test',
};

/** Execute installed tools without pnpm's implicit dependency installation during a running stack. */
export function installedNodeTool(
    args: readonly string[]
): { command: string; args: string[] } | null {
    if (args[0] !== 'exec' || !args[1]) {
        return null;
    }
    const binary = args[1];
    if (binary === 'node') {
        return { command: process.execPath, args: args.slice(2) };
    }
    const packageName = packages[binary];
    if (!packageName) {
        return null;
    }
    const directory = resolve('node_modules', packageName);
    const manifest: unknown = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
    if (!isRecord(manifest)) {
        throw new Error(`Invalid installed package: ${packageName}`);
    }
    const entry =
        typeof manifest.bin === 'string'
            ? manifest.bin
            : isRecord(manifest.bin) && manifest.bin[binary];
    if (typeof entry !== 'string') {
        throw new Error(`Missing installed executable: ${binary}`);
    }
    return { command: process.execPath, args: [resolve(directory, entry), ...args.slice(2)] };
}
