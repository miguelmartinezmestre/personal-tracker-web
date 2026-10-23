// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
    findForbiddenQueries,
    findMissingContracts,
    findNonFunctionStatements,
    findRawPublicFunctions,
    listConvexSources,
    parseSource,
} from './guardrails.analysis';

const ALLOWED_RAW_PUBLIC_FUNCTIONS = new Set([
    'convex/organizations.ts:getCurrentSession:query',
    'convex/organizations.ts:getPublicInvitationStatus:query',
    'convex/setup.ts:isPlatformSetUp:query',
    'convex/setup.ts:getPublicPlatformSettings:query',
    'convex/setup.ts:completeSetup:mutation',
]);

// Convex needs these at the root: schema, app and auth config, crons and the HTTP router.
const ROOT_TECHNICAL_FILES = new Set([
    'convex/auth.config.ts',
    'convex/convex.config.ts',
    'convex/crons.ts',
    'convex/http.ts',
    'convex/httpPolyfills.ts',
    'convex/schema.ts',
]);

// kitcn reads the Better Auth definition from the default export of convex/auth.ts.
const ALLOWED_ROOT_STATEMENTS = new Set(['convex/auth.ts:default']);

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

    test('registered functions declare args, returns and handler', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));

        const missing = listConvexSources(join(root, 'convex')).flatMap(file =>
            findMissingContracts(parseSource(file)).map(
                gap => `${relative(root, file).replace(/\\/g, '/')}:${gap.name} ${gap.property}`
            )
        );

        expect(missing).toEqual([]);
    });

    test('root files hold only registered functions; helpers live in convex/features', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));

        const unexpected = readdirSync(join(root, 'convex'), { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
            .map(entry => `convex/${entry.name}`)
            .filter(file => !ROOT_TECHNICAL_FILES.has(file))
            .flatMap(file =>
                findNonFunctionStatements(parseSource(join(root, file))).map(
                    name => `${file}:${name}`
                )
            )
            .filter(key => !ALLOWED_ROOT_STATEMENTS.has(key));

        expect(unexpected).toEqual([]);
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
});
