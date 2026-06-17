import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type RawPublicFunction = {
    file: string;
    name: string;
    kind: 'query' | 'mutation' | 'action';
};

const ALLOWED_RAW_PUBLIC_FUNCTIONS = new Set([
    'convex/organizations.ts:getCurrentSession:query',
    'convex/setup.ts:isPlatformSetUp:query',
    'convex/setup.ts:getPublicPlatformSettings:query',
    'convex/setup.ts:isCurrentUserPlatformSetupUser:query',
    'convex/setup.ts:completeSetup:mutation',
]);

function listTopLevelConvexFiles() {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const convexDir = join(root, 'convex');

    return readdirSync(convexDir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
        .map(entry => join(convexDir, entry.name));
}

function findRawPublicFunctions(): RawPublicFunction[] {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const publicFunctionPattern =
        /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(query|mutation|action)\s*\(/g;

    return listTopLevelConvexFiles().flatMap(file => {
        const source = readFileSync(file, 'utf8');
        return Array.from(source.matchAll(publicFunctionPattern)).map(match => ({
            file: relative(root, file).replace(/\\/g, '/'),
            name: match[1]!,
            kind: match[2] as RawPublicFunction['kind'],
        }));
    });
}

describe('public Convex function guardrail', () => {
    test('new public business functions must use RLS or be explicitly allowlisted', () => {
        const rawPublicFunctions = findRawPublicFunctions();
        const unexpected = rawPublicFunctions.filter(
            fn => !ALLOWED_RAW_PUBLIC_FUNCTIONS.has(`${fn.file}:${fn.name}:${fn.kind}`)
        );

        expect(unexpected).toEqual([]);
    });
});
