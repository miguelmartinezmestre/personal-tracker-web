import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function listSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '_generated' || entry.name === 'tests') {
                return [];
            }
            return listSourceFiles(path);
        }

        return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
    });
}

describe('runtime parity guardrail', () => {
    test('Convex source does not branch on the Vitest runtime', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));
        const convexDir = join(root, 'convex');
        const forbiddenRuntimeBranch = ['is', 'Vitest', 'Runtime'].join('');

        const filesWithVitestRuntimeBranch = listSourceFiles(convexDir)
            .map(file => ({
                file: relative(root, file).replace(/\\/g, '/'),
                source: readFileSync(file, 'utf8'),
            }))
            .filter(({ source }) => source.includes(forbiddenRuntimeBranch));

        expect(filesWithVitestRuntimeBranch.map(({ file }) => file)).toEqual([]);
    });
});
