import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, runCommand } from './lib/command';

function snapshot(directory: string): Record<string, string> {
    if (!existsSync(directory)) {
        return {};
    }
    return Object.fromEntries(
        readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = join(directory, entry.name);
            if (entry.isDirectory()) {
                return Object.entries(snapshot(file));
            }
            return /\.(?:ts|js)$/.test(file)
                ? [[file, createHash('sha256').update(readFileSync(file)).digest('hex')]]
                : [];
        })
    );
}
const before = { ...snapshot('convex/_generated'), ...snapshot('convex/generated') };
await runCommand(PNPM_COMMAND, ['exec', 'tsx', 'scripts/verification-backend.ts', 'codegen'], {
    shell: USE_SHELL_FOR_PNPM,
    logFile: 'reports/verification/codegen.log',
});
const after = { ...snapshot('convex/_generated'), ...snapshot('convex/generated') };
const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    file => before[file] !== after[file]
);
mkdirSync('reports/verification', { recursive: true });
writeFileSync(
    'reports/verification/codegen.json',
    JSON.stringify(
        { checkedAt: new Date().toISOString(), changed, files: Object.keys(after).length },
        null,
        2
    ) + '\n'
);
if (changed.length) {
    throw new Error(`Generated code drift: ${changed.join(', ')}`);
}
console.log('Generated code matches a fresh local Convex codegen.');
