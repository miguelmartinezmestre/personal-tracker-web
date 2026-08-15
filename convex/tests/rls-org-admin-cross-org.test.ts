import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';
import { identityFor } from './test_identities';

async function expectEmptyListOrDenied<T>(promise: Promise<T[]>) {
    try {
        const result = await promise;
        expect(result).toHaveLength(0);
    } catch (error) {
        expect(error).toBeDefined();
    }
}

describe('organization admins cannot access another organization by id', () => {
    const t = initConvexTest();

    let orgAOwnerIdentity: TestConvexForDataModel<DataModel>;
    let orgAOwnerId: Id<'user'>;
    let orgBUserId: Id<'user'>;
    let orgBId: Id<'organization'>;
    let orgBObjectiveId: Id<'objectives'>;
    let orgBProgressId: Id<'progressUpdates'>;
    let orgBNotificationId: Id<'notifications'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);

        const orgAId = await createTestOrganization(t, {
            name: `Cross Org A ${suffix}`,
            slug: `cross-org-a-${suffix}`,
        });
        orgBId = await createTestOrganization(t, {
            name: `Cross Org B ${suffix}`,
            slug: `cross-org-b-${suffix}`,
        });

        const orgAOwner = await createTestUser(t, {
            userId: `cross-org-owner-${suffix}`,
            email: `cross-org-owner-${suffix}@example.com`,
            name: `Cross Org Owner ${suffix}`,
            password: 'test-password',
            role: 'user',
        });
        orgAOwnerId = orgAOwner.docId;

        const orgBUser = await createTestUser(t, {
            userId: `cross-org-victim-${suffix}`,
            email: `cross-org-victim-${suffix}@example.com`,
            name: `Cross Org Victim ${suffix}`,
            password: 'test-password',
            role: 'user',
        });
        orgBUserId = orgBUser.docId;

        await createTestMember(t, {
            organizationId: orgAId,
            userId: orgAOwnerId,
            role: 'owner',
        });
        await createTestMember(t, {
            organizationId: orgBId,
            userId: orgBUserId,
            role: 'owner',
        });

        orgAOwnerIdentity = t.withIdentity(identityFor(orgAOwner));

        orgBObjectiveId = await createTestObjective(t, {
            userId: orgBUserId,
            organizationId: orgBId,
            title: 'Org B private objective',
            targetValue: 100,
            currentValue: 10,
        });

        const now = Date.now();
        orgBProgressId = await t.run(async ctx => {
            return await ctx.db.insert('progressUpdates', {
                objective: orgBObjectiveId,
                createdBy: orgBUserId,
                organizationId: orgBId,
                updatedValue: 5,
                updateDate: now,
                comment: 'Private org B progress',
                createdAt: now,
                updatedAt: now,
            });
        });

        orgBNotificationId = await t.run(async ctx => {
            return await ctx.db.insert('notifications', {
                userId: orgBUserId,
                organizationId: orgBId,
                objective: orgBObjectiveId,
                read: false,
                notificationType: 'reminder',
                notificationDate: now,
                message: 'Private org B notification',
                createdAt: now,
                updatedAt: now,
            });
        });
    });

    test('does not reveal another organization objective by id', async () => {
        try {
            const result = await orgAOwnerIdentity.query(api.objectives.getObjectiveById, {
                id: orgBObjectiveId,
            });
            expect(result).toBeNull();
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('does not reveal another organization progress updates by objective id', async () => {
        try {
            const result = await orgAOwnerIdentity.query(
                api.update_progress.getUpdateProgressByObjectiveId,
                {
                    objectiveId: orgBObjectiveId,
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );
            expect(result.page).toHaveLength(0);
        } catch (error) {
            expect(error).toBeDefined();
        }

        await expectEmptyListOrDenied(
            orgAOwnerIdentity
                .query(api.update_progress.getProgressSeriesByObjectiveId, {
                    objectiveId: orgBObjectiveId,
                })
                .then(result => result.points)
        );
    });

    test('cannot create, update, or delete progress for another organization', async () => {
        await expect(
            orgAOwnerIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: orgBObjectiveId,
                updatedValue: 7,
                updateDate: Date.now(),
                comment: 'Cross-org write attempt',
            })
        ).rejects.toThrow(/RLS|FORBIDDEN|OBJECTIVE_NOT_FOUND|NOT_AUTHORIZED|Unauthorized/i);

        await expect(
            orgAOwnerIdentity.mutation(api.update_progress.updateUpdateProgress, {
                id: orgBProgressId,
                updatedValue: 11,
                updateDate: Date.now(),
                comment: 'Cross-org update attempt',
            })
        ).rejects.toThrow(/RLS|FORBIDDEN|PROGRESS_NOT_FOUND|OBJECTIVE_NOT_FOUND|Unauthorized/i);

        await expect(
            orgAOwnerIdentity.mutation(api.update_progress.deleteUpdateProgress, {
                _id: orgBProgressId,
            })
        ).rejects.toThrow(/RLS|FORBIDDEN|PROGRESS_NOT_FOUND|Unauthorized/i);

        const progress = await t.run(async ctx => ctx.db.get(orgBProgressId));
        expect(progress).not.toBeNull();
        expect(progress?.updatedValue).toBe(5);
    });

    test('cannot modify or delete notifications from another organization', async () => {
        await expect(
            orgAOwnerIdentity.mutation(api.notifications.setNotificationRead, {
                id: orgBNotificationId,
                read: true,
            })
        ).rejects.toThrow(/RLS|FORBIDDEN|NOT_AUTHORIZED_NOTIFICATION|Unauthorized/i);

        await expect(
            orgAOwnerIdentity.mutation(api.notifications.deleteNotification, {
                id: orgBNotificationId,
            })
        ).rejects.toThrow(/RLS|FORBIDDEN|NOT_AUTHORIZED_NOTIFICATION|Unauthorized/i);

        const notification = await t.run(async ctx => ctx.db.get(orgBNotificationId));
        expect(notification).not.toBeNull();
        expect(notification?.read).toBe(false);
    });

    test('does not reveal organization achievements or contributors from another organization', async () => {
        await expectEmptyListOrDenied(
            orgAOwnerIdentity.query(internal.achievements.getOrganizationAchievements, {
                organizationId: orgBId,
            })
        );
    });
});
