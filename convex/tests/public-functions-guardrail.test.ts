// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
    findForbiddenQueries,
    findRawPublicFunctions,
    listConvexSources,
    parseSource,
} from './guardrails.analysis';

const ALLOWED_RAW_PUBLIC_FUNCTIONS = new Set([
    'convex/organizations.ts:getCurrentSession:query',
    'convex/organizations.ts:getPublicInvitationStatus:query',
    'convex/setup.ts:isPlatformSetUp:query',
    'convex/setup.ts:getPublicPlatformSettings:query',
    'convex/setup.ts:isCurrentUserPlatformSetupUser:query',
    'convex/setup.ts:completeSetup:mutation',
]);

describe('public Convex function guardrail', () => {
    test('business functions at every directory depth require RLS or an explicit exception', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));
        const unexpected = listConvexSources(join(root, 'convex'))
            .flatMap(file =>
                findRawPublicFunctions(parseSource(file)).map(
                    fn => `${relative(root, file).replace(/\\/g, '/')}:${fn.name}:${fn.kind}`
                )
            )
            .filter(key => !ALLOWED_RAW_PUBLIC_FUNCTIONS.has(key));
        expect(unexpected).toEqual([]);
    });

    test('database queries do not use filter or collect', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));
        const failures = listConvexSources(join(root, 'convex')).flatMap(file =>
            findForbiddenQueries(parseSource(file)).map(
                failure =>
                    `${relative(root, file).replace(/\\/g, '/')}:${failure.line} ${failure.method}`
            )
        );
        expect(failures).toEqual([]);
    });
});

function listFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) return listFiles(file);
        return entry.isFile() && entry.name.endsWith('.ts') ? [file] : [];
    });
}

describe('Convex test files stay out of the function bundle', () => {
    const root = fileURLToPath(new URL('../..', import.meta.url));

    test('every file under convex/tests uses an extra-dot name Convex will skip', () => {
        const leaked = listFiles(join(root, 'convex', 'tests'))
            .map(file => relative(root, file).replace(/\\/g, '/'))
            .filter(file => (file.split('/').pop() ?? '').split('.').length < 3);
        expect(leaked).toEqual([]);
    });

    test('generated Convex API does not register test modules', () => {
        const api = readFileSync(join(root, 'convex/_generated/api.d.ts'), 'utf8');
        expect(
            [...api.matchAll(/from ['"](\.\.\/tests\/[^'"]+)['"]/g)].map(match => match[1])
        ).toEqual([]);
    });

    test('auth config does not load optional Convex env vars', () => {
        const source = readFileSync(join(root, 'convex/auth.config.ts'), 'utf8');
        expect(source).not.toMatch('SETUP_SECRET');
        expect(source).not.toMatch("from './env'");
    });
});
