// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    findRawPublicFunctions,
    listConvexSources,
    parseSource,
} from '../../scripts/lib/convex-guardrails';

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
});
