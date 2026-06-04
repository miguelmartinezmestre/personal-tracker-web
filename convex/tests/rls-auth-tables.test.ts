import { describe, expect, test } from 'vitest';
import { wrapDatabaseReader } from 'convex-helpers/server/rowLevelSecurity';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import { createRlsRules } from '../platform/rls/policies';

const rlsConfig = { defaultPolicy: 'deny' as const };

describe('RLS auth and organization tables', () => {
    test('members can read their active organization through RLS', async () => {
        const t = initConvexTest();
        const suffix = Math.random().toString(36).slice(2, 12);
        const user = await createTestUser(t, {
            userId: `rls-org-user-${suffix}`,
            email: `rls-org-user-${suffix}@example.com`,
            name: `RLS Org User ${suffix}`,
            role: 'user',
        });
        const organizationId = await createTestOrganization(t, {
            name: `RLS Org ${suffix}`,
            slug: `rls-org-${suffix}`,
        });
        await createTestMember(t, {
            organizationId,
            userId: user.docId,
            role: 'owner',
        });

        const organization = await t.run(async ctx => {
            const rules = await createRlsRules(
                user.docId,
                user.role ?? 'user',
                'owner',
                ctx,
                organizationId
            );
            const rlsDb = wrapDatabaseReader(ctx, ctx.db, rules, rlsConfig);

            return await rlsDb.get('organization', organizationId);
        });

        expect(organization?._id).toBe(organizationId);
    });
});
