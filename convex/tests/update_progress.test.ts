import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestCollaborator,
    createTestObjective,
    readScheduledFunctionArg,
} from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';
import { identityFor } from './test_identities';
import { toUtcCivilDay } from '../../shared/civil-date';

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
        expect(progressUpdate?.updateDate).toBe(toUtcCivilDay(updateDate));
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
            return rows.map(row => row._id);
        });
        const beforeIdSet = new Set(beforeIds);

        const progressUpdate = await otherUserIdentity.mutation(
            api.update_progress.createUpdateProgress,
            {
                objective: objectiveId,
                updatedValue: 10,
                updateDate: Date.now(),
            }
        );

        const progressJobs = await t.run(async ctx => {
            const rows = await ctx.db.system.query('_scheduled_functions').collect();
            return rows
                .filter(row => !beforeIdSet.has(row._id))
                .map(readScheduledFunctionArg)
                .filter(arg => arg?.trigger === 'progress_update');
        });

        expect(progressJobs.length).toBeGreaterThan(0);
        expect(progressJobs.every(arg => arg?.userId === otherUser.docId)).toBe(true);
        expect(progressJobs.some(arg => arg?.userId === userId)).toBe(false);

        if (!progressUpdate) {
            throw new Error('Expected progress update');
        }
        const beforeEditIds = await t.run(async ctx =>
            (await ctx.db.system.query('_scheduled_functions').collect()).map(row => row._id)
        );
        const beforeEditIdSet = new Set(beforeEditIds);
        await userIdentity.mutation(api.update_progress.updateUpdateProgress, {
            id: progressUpdate._id,
            updatedValue: 15,
            updateDate: Date.now(),
        });

        const editProgressJobUsers = await t.run(async ctx => {
            return (await ctx.db.system.query('_scheduled_functions').collect())
                .filter(row => !beforeEditIdSet.has(row._id))
                .map(readScheduledFunctionArg)
                .filter(args => args?.trigger === 'progress_update')
                .map(args => {
                    if (!args) {
                        throw new Error('Expected scheduled progress job args');
                    }
                    return args.userId;
                });
        });
        expect(new Set(editProgressJobUsers)).toEqual(new Set([otherUser.docId, userId]));
    });

    test('collaborator completion awards the creator and records the collaborator for the organization', async () => {
        const suffix = Math.random().toString(36).substring(2, 15);
        const collaborator = await createTestUser(t, {
            userId: `completion-collaborator-${suffix}`,
            email: `completion-collaborator-${suffix}@example.com`,
            name: 'Completion Collaborator',
            role: 'member',
        });
        await createTestMember(t, {
            organizationId,
            userId: collaborator.docId,
            role: 'member',
        });
        await createTestCollaborator(t, {
            objectiveId,
            userId: collaborator.docId,
            organizationId,
            addedBy: userId,
            role: 'editor',
        });
        const collaboratorIdentity = t.withIdentity(identityFor(collaborator));

        for (let index = 0; index < 4; index++) {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: `Existing completed objective ${index}`,
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
            });
        }

        await collaboratorIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 50,
            updateDate: Date.now(),
        });
        await drainScheduledFunctions(t);

        const creatorProgress = await userIdentity.query(
            api.achievements.getUserAchievementProgress,
            {}
        );
        const collaboratorProgress = await collaboratorIdentity.query(
            api.achievements.getUserAchievementProgress,
            {}
        );
        expect(
            creatorProgress.find(item => item.definition.code === 'objectives_completed_3')
        ).toMatchObject({ currentProgress: 5, isEarned: true });
        expect(
            collaboratorProgress.find(item => item.definition.code === 'objectives_completed_3')
        ).toMatchObject({ currentProgress: 0, isEarned: false });

        const attribution = await t.run(async ctx => {
            const organizationAchievement = await ctx.db
                .query('organizationAchievements')
                .withIndex('by_organization_achievement', q =>
                    q
                        .eq('organization', organizationId)
                        .eq('achievement', 'organization_completed_5')
                )
                .first();
            return organizationAchievement
                ? await ctx.db
                      .query('organizationAchievementContributors')
                      .withIndex('by_organizationAchievement_user', q =>
                          q.eq('organizationAchievementId', organizationAchievement._id)
                      )
                      .first()
                : null;
        });
        expect(attribution?.userId).toBe(collaborator.docId);
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

        await userIdentity.run(async ctx => {
            await ctx.db.patch('objectives', objectiveId, { currentValue: 180300 });
        });
        const series = await userIdentity.query(
            api.update_progress.getProgressSeriesByObjectiveId,
            {
                objectiveId,
            }
        );

        expect(series.seriesStartValue).toBe(5050);
        expect(
            series.seriesStartValue +
                series.points.reduce((sum, point) => sum + point.updatedValue, 0)
        ).toBe(180300);
        expect(series.isTruncated).toBe(true);
        expect(series.points).toHaveLength(500);
        expect(series.points.map(update => update.updatedValue).slice(0, 3)).toEqual([
            101, 102, 103,
        ]);
        expect(series.points[series.points.length - 1].updatedValue).toBe(600);
        expect(
            series.points.every((update, index, points) => {
                if (index === 0) {
                    return true;
                }
                return update.updateDate >= points[index - 1].updateDate;
            })
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
        expect(updated?.updateDate).toBe(toUtcCivilDay(newUpdateDate));
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

        const deleted = await userIdentity.run(async ctx =>
            ctx.db.get('progressUpdates', progressUpdateId)
        );
        expect(deleted).toBeNull();
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
            const update = await ctx.db.get('progressUpdates', id);
            if (!update) {
                throw new Error('Expected inserted progress update');
            }
            return { id, initialUpdatedAt: update.updatedAt };
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = await userIdentity.mutation(api.update_progress.updateUpdateProgress, {
            id: progressUpdateId.id,
            updatedValue: 85,
            updateDate: Date.now(),
        });
        if (!updated) {
            throw new Error('Expected updated progress update');
        }

        expect(updated.updatedAt).toBeGreaterThan(progressUpdateId.initialUpdatedAt);
    });
});
