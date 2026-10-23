import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { DAY_MS, startOfUtcDay } from '../features/objectives/rules';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    type TestUserData,
} from './test.helpers';
import { identityFor } from './test.identities';

const page = { numItems: 20, cursor: null };

describe('notifications', () => {
    const t = initConvexTest();
    let organizationId: Id<'organization'>;
    let owner: TestUserData;
    let creator: TestUserData;
    let granted: TestUserData;
    let outsider: TestUserData;

    const as = (user: TestUserData) => t.withIdentity(identityFor(user));
    const runScheduled = () => t.finishAllScheduledFunctions(() => vi.runAllTimers());

    async function joinAs(role: string, name: string, organization = organizationId) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `${name}-${suffix}`,
            email: `${name}-${suffix}@example.com`,
            name,
            role: 'user',
        });

        await createTestMember(t, { organizationId: organization, userId: user.docId, role });

        return user;
    }

    // Achievements unlocked along the way have their own tests.
    const keysOf = async (user: TestUserData) =>
        (await as(user).query(api.notifications.listNotifications, { paginationOpts: page })).page
            .filter(notification => notification.type !== 'achievement')
            .map(notification => `${notification.messageKey}:${notification.message}`)
            .sort();

    beforeEach(async () => {
        vi.useFakeTimers();
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: `Notices ${suffix}`,
            slug: `notices-${suffix}`,
        });
        owner = await joinAs('owner', 'owner');
        creator = await joinAs('member', 'creator');
        granted = await joinAs('member', 'granted');
        outsider = await joinAs('member', 'outsider');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('milestones and completion reach everyone who can see the objective, as they choose @REQ-NOTIFICACIONES-001 @INH-NOT-01 @INH-NOT-03 @INH-NOT-04 @INH-NOT-08', async () => {
        await as(owner).mutation(api.notifications.updateNotificationPreferences, {
            deadline: true,
            progress: false,
            status: true,
            achievement: true,
        });

        const objectiveId = await as(creator).mutation(api.objectives.createObjective, {
            title: 'Run',
            startValue: 0,
            targetValue: 10,
            memberAccess: 'none',
            users: [{ userId: granted.docId, access: 'view' }],
        });

        // Passing 25 and 50 % at once tells only the last milestone.
        await as(creator).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 6,
            updateDate: startOfUtcDay(Date.now()),
        });
        await runScheduled();

        const milestone = 'progressMilestone:Objective "Run" reached 50% of its target.';
        expect(await keysOf(creator)).toEqual([milestone]);
        expect(await keysOf(granted)).toEqual([milestone]);
        expect(await keysOf(owner)).toEqual([]);

        await as(creator).mutation(api.progress.createProgress, {
            objectiveId,
            updatedValue: 4,
            updateDate: startOfUtcDay(Date.now()),
        });
        await runScheduled();

        const completed = 'objectiveCompleted:Objective "Run" has been completed.';
        expect(await keysOf(creator)).toEqual([completed, milestone]);
        expect(await keysOf(granted)).toEqual([completed, milestone]);
        expect(await keysOf(owner)).toEqual([completed]);
        expect(await keysOf(outsider)).toEqual([]);

        await as(creator).mutation(api.objectives.deleteObjective, { id: objectiveId });
        await as(creator).mutation(api.trash.purgeObjective, { id: objectiveId });
        await runScheduled();

        expect(await keysOf(creator)).toEqual([]);
    });

    test('the daily task tells each deadline stage once per objective and day @REQ-NOTIFICACIONES-001 @INH-NOT-02 @INH-OBJ-19', async () => {
        const today = startOfUtcDay(Date.now());

        const create = (title: string, days: number, dueSoonDays?: number) =>
            as(creator).mutation(api.objectives.createObjective, {
                title,
                startValue: 0,
                targetValue: 10,
                deadline: today + days * DAY_MS,
                dueSoonDays,
            });

        await create('Soon', 3, 3);
        await create('Now', 0);
        await create('Later', 5);

        for (let run = 0; run < 2; run++) {
            await t.mutation(internal.notifications.sendDeadlineNotifications, { today });
            await runScheduled();
        }

        const keys = await keysOf(outsider);
        expect(keys).toHaveLength(2);
        expect(keys[0]).toMatch(/^deadlineToday:Objective "Now" is due today/);
        expect(keys[1]).toMatch(/^deadlineUpcoming:Objective "Soon" is due in 3 days/);
    });

    test('users read, mark and delete only their own notifications in the active organization @REQ-NOTIFICACIONES-002 @REQ-NOTIFICACIONES-003 @REQ-NOTIFICACIONES-004 @INH-NOT-06 @INH-NOT-07', async () => {
        const otherOrganizationId = await createTestOrganization(t, {
            name: 'Elsewhere',
            slug: `elsewhere-${Math.random().toString(36).slice(2, 10)}`,
        });

        const notice = {
            notificationType: 'achievement' as const,
            messageKey: 'achievementEarned',
            messageParams: { code: 'first_objective' },
            message: 'Achievement earned.',
            read: false,
        };

        const [ownFirst, othersId] = await t.run(async ctx => {
            const ids = [];

            // More than one batch of 100, without objectives (REQ-NOTIFICACIONES-004).
            for (let index = 0; index < 150; index++) {
                ids.push(
                    await ctx.db.insert('notifications', {
                        ...notice,
                        userId: creator.docId,
                        organizationId,
                        notificationDate: index,
                    })
                );
            }

            await ctx.db.insert('notifications', {
                ...notice,
                userId: creator.docId,
                organizationId: otherOrganizationId,
                notificationDate: 0,
            });

            const othersNotification = await ctx.db.insert('notifications', {
                ...notice,
                userId: owner.docId,
                organizationId,
                notificationDate: 0,
            });

            return [ids[0], othersNotification];
        });

        const listed = await as(creator).query(api.notifications.listNotifications, {
            paginationOpts: page,
        });

        expect(listed.page.map(notification => notification.date)).toEqual(
            Array.from({ length: 20 }, (_, index) => 149 - index)
        );
        expect(await as(creator).query(api.notifications.countUnreadNotifications, {})).toBe(100);

        await expect(
            as(creator).mutation(api.notifications.setNotificationRead, {
                id: othersId,
                read: true,
            })
        ).rejects.toThrow('NOTIFICATION_NOT_FOUND');

        await as(creator).mutation(api.notifications.markAllNotificationsRead, {});
        await runScheduled();

        await t.run(async ctx => {
            const unread = await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_read', q => q.eq('userId', creator.docId))
                .collect();

            expect(unread.filter(row => !row.read).map(row => row.organizationId)).toEqual([
                otherOrganizationId,
            ]);
            expect((await ctx.db.get('notifications', othersId))?.read).toBe(false);
        });

        await as(creator).mutation(api.notifications.setNotificationRead, {
            id: ownFirst,
            read: false,
        });
        expect(await as(creator).query(api.notifications.countUnreadNotifications, {})).toBe(1);

        await as(creator).mutation(api.notifications.deleteNotification, { id: ownFirst });
        expect(await as(creator).query(api.notifications.countUnreadNotifications, {})).toBe(0);
    });
});
