import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestCollaborator,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

describe('convex update_progress', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let objectiveId: Id<'objectives'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-update-progress-' + randomSuffix,
            email: 'update-progress@example.com-' + randomSuffix,
            name: 'Update Progress Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Update Progress Org ' + randomSuffix,
            slug: 'update-progress-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        objectiveId = await userIdentity.run(async ctx => {
            return await ctx.db.insert('objectives', {
                createdBy: userId,

                ownerId: userId,

                visibility: 'private',
                organizationId: organizationId,
                title: 'Test Objective',
                targetValue: 100,
                currentValue: 50,
                startValue: 50,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });
    });

    test('createUpdateProgress creates a new progress update', async () => {
        const updateDate = Date.now();
        const progressUpdate = await userIdentity.mutation(
            api.update_progress.createUpdateProgress,
            {
                objective: objectiveId,
                updatedValue: 75,
                updateDate,
                comment: 'Great progress!',
            }
        );

        expect(progressUpdate).toBeDefined();
        expect(progressUpdate?.updatedValue).toBe(75);
        expect(progressUpdate?.updateDate).toBe(updateDate);
        expect(progressUpdate?.comment).toBe('Great progress!');
        expect(progressUpdate?.objective).toBe(objectiveId);
        expect(progressUpdate?.createdBy).toBe(userId);
    });

    test('does not create progress or completion notifications when progress notifications are disabled', async () => {
        await userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
            progressNotifications: false,
        });

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 50,
            updateDate: Date.now(),
            comment: 'Completes without notification',
        });

        const notifications = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', userId).eq('organizationId', organizationId)
                )
                .collect();
        });

        expect(notifications).toEqual([]);
    });

    test('createUpdateProgress records the acting user as createdBy, not the objective creator', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const otherUser = await createTestUser(t, {
            userId: 'other-progress-user-' + randomSuffix,
            email: 'other-progress@example.com-' + randomSuffix,
            name: 'Other Progress User',
            password: 'test-password',
            role: 'member',
            emailVerified: false,
        });

        await createTestMember(t, {
            organizationId,
            userId: otherUser.docId,
            role: 'member',
        });

        await createTestCollaborator(t, {
            objectiveId,
            userId: otherUser.docId,
            organizationId,
            addedBy: userId,
            role: 'editor',
        });

        const otherUserIdentity = t.withIdentity({
            subject: otherUser.docId,
            role: otherUser.role ?? 'member',
            email: otherUser.email,
            name: otherUser.name,
            password: otherUser.password,
            emailVerified: false,
            createdAt: Date.now(),
            userId: otherUser.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const progressUpdate = await otherUserIdentity.mutation(
            api.update_progress.createUpdateProgress,
            {
                objective: objectiveId,
                updatedValue: 10,
                updateDate: Date.now(),
            }
        );

        expect(progressUpdate?.createdBy).toBe(otherUser.docId);
        expect(progressUpdate?.createdBy).not.toBe(userId);
    });

    test('progress achievements are attributed to the contributing user, not the objective creator', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const otherUser = await createTestUser(t, {
            userId: 'attrib-progress-user-' + randomSuffix,
            email: 'attrib-progress@example.com-' + randomSuffix,
            name: 'Attribution Progress User',
            password: 'test-password',
            role: 'member',
            emailVerified: false,
        });

        await createTestMember(t, {
            organizationId,
            userId: otherUser.docId,
            role: 'member',
        });

        await createTestCollaborator(t, {
            objectiveId,
            userId: otherUser.docId,
            organizationId,
            addedBy: userId,
            role: 'editor',
        });

        const otherUserIdentity = t.withIdentity({
            subject: otherUser.docId,
            role: otherUser.role ?? 'member',
            email: otherUser.email,
            name: otherUser.name,
            password: otherUser.password,
            emailVerified: false,
            createdAt: Date.now(),
            userId: otherUser.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const beforeIds = await t.run(async ctx => {
            const rows = await ctx.db.system.query('_scheduled_functions').collect();
            return rows.map(row => row._id as string);
        });
        const beforeIdSet = new Set(beforeIds);

        await otherUserIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 10,
            updateDate: Date.now(),
        });

        const progressJobs = await t.run(async ctx => {
            const rows = await ctx.db.system.query('_scheduled_functions').collect();
            return rows
                .filter(row => !beforeIdSet.has(row._id as string))
                .map(row => row.args[0] as { userId: Id<'user'>; trigger: string } | undefined)
                .filter(arg => arg?.trigger === 'progress_update');
        });

        expect(progressJobs.length).toBeGreaterThan(0);
        expect(progressJobs.every(arg => arg?.userId === otherUser.docId)).toBe(true);
        expect(progressJobs.some(arg => arg?.userId === userId)).toBe(false);
    });

    test('createUpdateProgress works without comment', async () => {
        const updateDate = Date.now();
        const progressUpdate = await userIdentity.mutation(
            api.update_progress.createUpdateProgress,
            {
                objective: objectiveId,
                updatedValue: 80,
                updateDate,
            }
        );

        expect(progressUpdate?.updatedValue).toBe(80);
        expect(progressUpdate?.comment).toBeUndefined();
    });

    test('getUpdateProgressByObjectiveId returns all updates for an objective', async () => {
        const updateDate1 = Date.now();
        const updateDate2 = Date.now() + 1000;

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 10,
            updateDate: updateDate1,
            comment: 'First update',
        });

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 20,
            updateDate: updateDate2,
            comment: 'Second update',
        });

        const updates = await userIdentity.query(
            api.update_progress.getUpdateProgressByObjectiveId,
            {
                objectiveId,
                paginationOpts: { numItems: 10, cursor: null },
            }
        );

        expect(updates.page).toHaveLength(2);
        expect(updates.page.map(update => update.updatedValue)).toContain(10);
        expect(updates.page.map(update => update.updatedValue)).toContain(20);
    });

    test('getProgressSeriesByObjectiveId returns an ordered bounded series for charts', async () => {
        const base = Date.now();
        for (let i = 0; i < 3; i++) {
            await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: i + 1,
                updateDate: base + i * 1000,
            });
        }

        const series = await userIdentity.query(
            api.update_progress.getProgressSeriesByObjectiveId,
            {
                objectiveId,
            }
        );

        expect(series.points.map(update => update.updatedValue)).toEqual([1, 2, 3]);
        expect(series.points).toHaveLength(3);
        expect(series.isTruncated).toBe(false);
    });

    test('getProgressSeriesByObjectiveId returns the most recent bounded chart window and truncation state', async () => {
        const base = Date.now() - 600_000;
        for (let i = 0; i < 600; i++) {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    createdBy: userId,
                    organizationId,
                    updatedValue: i + 1,
                    updateDate: base + i * 1000,
                    createdAt: base + i * 1000,
                    updatedAt: base + i * 1000,
                });
            });
        }

        const series = (await userIdentity.query(
            api.update_progress.getProgressSeriesByObjectiveId,
            {
                objectiveId,
            }
        )) as unknown as {
            points?: { updatedValue: number; updateDate: number }[];
            isTruncated?: boolean;
        };

        expect(series.isTruncated).toBe(true);
        expect(series.points).toHaveLength(500);
        expect(series.points?.map(update => update.updatedValue).slice(0, 3)).toEqual([
            101, 102, 103,
        ]);
        expect(series.points?.[series.points.length - 1]?.updatedValue).toBe(600);
        expect(
            series.points?.every((update, index, points) =>
                index === 0 ? true : update.updateDate >= points[index - 1]!.updateDate
            )
        ).toBe(true);
    });

    test('updateUpdateProgress modifies an existing update', async () => {
        const updateDate = Date.now();
        const progressUpdateId = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId: organizationId,
                updatedValue: 60,
                updateDate,
                comment: 'Initial comment',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return id;
        });

        const newUpdateDate = Date.now() + 2000;
        const updated = await userIdentity.mutation(api.update_progress.updateUpdateProgress, {
            id: progressUpdateId,
            updatedValue: 85,
            updateDate: newUpdateDate,
            comment: 'Updated comment',
        });

        expect(updated?.updatedValue).toBe(85);
        expect(updated?.updateDate).toBe(newUpdateDate);
        expect(updated?.comment).toBe('Updated comment');
    });

    test('deleteUpdateProgress removes an update', async () => {
        const progressUpdateId = await userIdentity.run(async ctx => {
            return await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId: organizationId,
                updatedValue: 60,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        const result = await userIdentity.mutation(api.update_progress.deleteUpdateProgress, {
            _id: progressUpdateId,
        });

        expect(result).toEqual({ success: true });

        const deleted = await userIdentity.run(async ctx => ctx.db.get(progressUpdateId));
        expect(deleted).toBeNull();
    });

    test('deleteUpdateProgress reconciles currentValue from remaining updates instead of clamping', async () => {
        // currentValue arranca desincronizado de los progress updates reales: insertamos dos
        // updates (+60, +30) directamente sin aplicar delta, dejando currentValue en 50.
        const { keep, remove } = await userIdentity.run(async ctx => {
            const now = Date.now();
            const keepId = await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 60,
                updateDate: now,
                createdAt: now,
                updatedAt: now,
            });
            const removeId = await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 30,
                updateDate: now,
                createdAt: now,
                updatedAt: now,
            });
            return { keep: keepId, remove: removeId };
        });

        await userIdentity.mutation(api.update_progress.deleteUpdateProgress, {
            _id: remove,
        });

        // Con el clamp ingenuo (max(50, 50-30)) quedaría 50; recompute reconstruye desde los
        // updates restantes: startValue(50) + 60 = 110, y status pasa a completed (>= target 100).
        const reconciled = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(reconciled?.currentValue).toBe(110);
        expect(reconciled?.status).toBe('completed');

        const survivor = await userIdentity.run(async ctx => ctx.db.get(keep));
        expect(survivor).not.toBeNull();
    });

    test('createUpdateProgress rejects when unauthenticated', async () => {
        await expect(
            t.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: 75,
                updateDate: Date.now(),
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });

    test('updateUpdateProgress updates updatedAt timestamp', async () => {
        const progressUpdateId = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId: organizationId,
                updatedValue: 60,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now() - 1000,
            });
            const update = await ctx.db.get(id);
            return { id, initialUpdatedAt: update?.updatedAt };
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = await userIdentity.mutation(api.update_progress.updateUpdateProgress, {
            id: progressUpdateId.id,
            updatedValue: 85,
            updateDate: Date.now(),
        });

        expect(updated?.updatedAt).toBeGreaterThan(progressUpdateId.initialUpdatedAt!);
    });
});
