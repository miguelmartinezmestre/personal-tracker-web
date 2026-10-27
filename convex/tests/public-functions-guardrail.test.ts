// @vitest-environment node
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
    findMissingContracts,
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

describe('public Convex function guardrail', () => {
    test('business functions at every directory depth require RLS or an explicit exception @INH-PER-06 @REQ-NF-003', () => {
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

    test('registered functions declare args, returns and handler @INH-SEG-01 @REQ-NF-005', () => {
        const root = fileURLToPath(new URL('../..', import.meta.url));

        const missing = listConvexSources(join(root, 'convex')).flatMap(file =>
            findMissingContracts(parseSource(file)).map(
                gap => `${relative(root, file).replace(/\\/g, '/')}:${gap.name} ${gap.property}`
            )
        );

        expect(missing).toEqual([]);
    });
});
