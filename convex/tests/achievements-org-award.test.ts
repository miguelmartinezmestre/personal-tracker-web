import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';

// Regression test for F1: organization-level achievements are now awarded
// (previously the org-achievement evaluator was never scheduled by any action).
describe('organization achievements are awarded (F1)', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);
        const user = await createTestUser(t, {
            userId: `org-achv-${suffix}`,
            email: `org-achv-${suffix}@example.com`,
            name: 'Org Achievements User',
            role: 'globalAdmin',
        });
        userId = user.docId;
        organizationId = await createTestOrganization(t, {
            name: `Org Achievements ${suffix}`,
            slug: `org-achv-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
        userIdentity = t.withIdentity({
            subject: user.docId,
            role: user.role ?? null,
            email: user.email,
            name: user.name,
            emailVerified: false,
            createdAt: Date.now(),
            userId: user.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('awards an organization achievement when an org objective is created', async () => {
        await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Org Objective',
            targetValue: 100,
            visibility: 'organization',
        });

        // The org-achievement evaluator is now scheduled alongside the
        // individual one; draining runs it and awards the org achievement.
        await drainScheduledFunctions(t);

        const organizationAchievements = await userIdentity.query(
            internal.achievements.getOrganizationAchievements,
            { organizationId }
        );

        expect(
            organizationAchievements.some(
                achievement => achievement.definition?.code === 'organization_first_objective'
            )
        ).toBe(true);
    });

    test('stale jobs cannot recreate achievements or notifications after organization deletion', async () => {
        await t.run(ctx => ctx.db.delete('organization', organizationId));

        const awardResult = await t.mutation(internal.achievements.checkOrganizationAchievements, {
            organizationId,
            userId,
            trigger: 'objective_created',
            orgScopedObjectivesCount: 1,
        });
        const notificationResult = await t.mutation(
            internal.achievements.notifyOrganizationAchievementMembers,
            {
                organizationId,
                code: 'organization_first_objective',
                points: 15,
                cursor: null,
            }
        );

        expect(awardResult).toMatchObject({ status: 'completed', aborted: true, awarded: [] });
        expect(notificationResult).toMatchObject({ status: 'completed', aborted: true });
        await t.run(async ctx => {
            expect(
                await ctx.db
                    .query('organizationAchievements')
                    .withIndex('by_organization_achievement', q =>
                        q.eq('organization', organizationId)
                    )
                    .collect()
            ).toHaveLength(0);
            expect(
                await ctx.db
                    .query('notifications')
                    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                    .collect()
            ).toHaveLength(0);
        });
    });
});
