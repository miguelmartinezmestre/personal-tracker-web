import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import type { DataModel, Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestSession,
    createTestUser,
    type TestUserData,
} from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import { identityFor } from './test_identities';

async function createActiveSession(
    t: ReturnType<typeof initConvexTest>,
    userId: Id<'user'>,
    organizationId: Id<'organization'>,
    suffix: string
) {
    return await createTestSession(t, {
        userId,
        activeOrganizationId: organizationId,
        expiresAt: Date.now() + 60_000,
        token: `active-org-session-${suffix}-${organizationId}`,
    });
}

describe('active organization tenant boundary', () => {
    const t = initConvexTest();

    let user: TestUserData;
    let userId: Id<'user'>;
    let orgAId: Id<'organization'>;
    let orgBId: Id<'organization'>;
    let activeOrgAIdentity: TestConvexForDataModel<DataModel>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);

        user = await createTestUser(t, {
            userId: `active-org-user-${suffix}`,
            email: `active-org-user-${suffix}@example.com`,
            name: `Active Org User ${suffix}`,
            role: 'user',
        });
        userId = user.docId;

        orgAId = await createTestOrganization(t, {
            name: `Active Org A ${suffix}`,
            slug: `active-org-a-${suffix}`,
        });
        orgBId = await createTestOrganization(t, {
            name: `Active Org B ${suffix}`,
            slug: `active-org-b-${suffix}`,
        });

        await createTestMember(t, { organizationId: orgAId, userId, role: 'owner' });
        await createTestMember(t, { organizationId: orgBId, userId, role: 'member' });

        const sessionId = await createActiveSession(t, userId, orgAId, suffix);
        activeOrgAIdentity = t.withIdentity(identityFor(user, sessionId));
    });

    test('notification list and unread count are scoped to the active organization', async () => {
        const now = Date.now();
        await t.run(async ctx => {
            await ctx.db.insert('notifications', {
                userId,
                organizationId: orgAId,
                read: false,
                notificationType: 'deadline',
                notificationDate: now,
                message: 'Org A notification',
            });
            await ctx.db.insert('notifications', {
                userId,
                organizationId: orgBId,
                read: false,
                notificationType: 'deadline',
                notificationDate: now + 1,
                message: 'Org B notification',
            });
        });

        const notifications = await activeOrgAIdentity.query(
            api.notifications.getNotificationsByUser,
            {
                paginationOpts: { numItems: 10, cursor: null },
            }
        );
        const overview = await activeOrgAIdentity.query(
            api.notifications.getNotificationOverview,
            {}
        );

        expect(notifications.page.map(notification => notification.message)).toEqual([
            'Org A notification',
        ]);
        expect(overview.unreadCount).toBe(1);
        expect(overview.isUnreadTruncated).toBe(false);
    });

    test('mark all read only changes notifications in the active organization', async () => {
        vi.useFakeTimers();
        try {
            const now = Date.now();
            const { orgANotificationId, orgBNotificationId } = await t.run(async ctx => {
                const orgANotificationId = await ctx.db.insert('notifications', {
                    userId,
                    organizationId: orgAId,
                    read: false,
                    notificationType: 'deadline',
                    notificationDate: now,
                    message: 'Org A unread notification',
                });
                const orgBNotificationId = await ctx.db.insert('notifications', {
                    userId,
                    organizationId: orgBId,
                    read: false,
                    notificationType: 'deadline',
                    notificationDate: now + 1,
                    message: 'Org B unread notification',
                });

                return { orgANotificationId, orgBNotificationId };
            });

            await expect(
                activeOrgAIdentity.mutation(api.notifications.markAllNotificationsRead, {})
            ).resolves.toBeNull();
            await t.finishAllScheduledFunctions(vi.runAllTimers);

            const result = await t.run(async ctx => ({
                orgA: await ctx.db.get('notifications', orgANotificationId),
                orgB: await ctx.db.get('notifications', orgBNotificationId),
            }));

            expect(result.orgA?.read).toBe(true);
            expect(result.orgB?.read).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    test('invalid active organization session does not fall back to another membership', async () => {
        const suffix = Math.random().toString(36).slice(2, 12);
        const outsiderOrgId = await createTestOrganization(t, {
            name: `Outsider Org ${suffix}`,
            slug: `outsider-org-${suffix}`,
        });
        const sessionId = await createActiveSession(t, userId, outsiderOrgId, suffix);
        const invalidActiveOrgIdentity = t.withIdentity(identityFor(user, sessionId));

        await createTestObjective(t, {
            userId,
            organizationId: orgAId,
            title: 'Org A personal objective',
            targetValue: 100,
            currentValue: 0,
        });

        const [activeMember, dashboardContext, objectives] = await Promise.all([
            invalidActiveOrgIdentity.query(api.organizations.getActiveMember, {}),
            invalidActiveOrgIdentity.query(api.auth.getDashboardContext, {}),
            invalidActiveOrgIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { numItems: 10, cursor: null },
            }),
        ]);

        expect(activeMember).toBeNull();
        expect(dashboardContext.organizationId).toBeNull();
        expect(objectives.page).toHaveLength(0);
    });

    test('organization objective search returns matching objectives created by other members', async () => {
        const suffix = Math.random().toString(36).slice(2, 12);
        const otherUser = await createTestUser(t, {
            userId: `active-org-other-${suffix}`,
            email: `active-org-other-${suffix}@example.com`,
            name: `Active Org Other ${suffix}`,
            role: 'user',
        });
        await createTestMember(t, {
            organizationId: orgAId,
            userId: otherUser.docId,
            role: 'member',
        });
        const objectiveId = await createTestObjective(t, {
            userId: otherUser.docId,
            organizationId: orgAId,
            title: 'Shared revenue objective',
            targetValue: 100,
            currentValue: 0,
        });

        const results = await activeOrgAIdentity.query(api.objectives.searchObjectivesPaginated, {
            search: 'revenue',
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(results.page.map(objective => objective._id)).toContain(objectiveId);
    });
});
