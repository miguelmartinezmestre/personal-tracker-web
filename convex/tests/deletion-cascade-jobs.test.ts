import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';

describe('organization deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('removes application data owned by the organization', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const user = await createTestUser(t, {
            userId: `organization-delete-${suffix}`,
            email: `organization-delete-${suffix}@example.com`,
            name: 'Organization owner',
            role: 'user',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Organization to delete ${suffix}`,
            slug: `organization-to-delete-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
        const objectiveId = await createTestObjective(t, {
            userId: user.docId,
            organizationId,
            title: 'Objective to delete',
            targetValue: 10,
        });
        const categoryId = await t.run(ctx =>
            ctx.db.insert('categories', {
                userId: user.docId,
                organizationId,
                name: 'Category to delete',
                color: '#000000',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        );

        await t.mutation(internal.admin.cascadeOrganizationDeletionInternal, {
            organizationId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
            expect(await ctx.db.get('categories', categoryId)).toBeNull();
        });
    });
});
