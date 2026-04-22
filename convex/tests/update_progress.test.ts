/// <reference types="vite/client" />
import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
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
            role: 'admin',
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
                userId: userId,
                organizationId: organizationId,
                scope: 'personal',
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
            updatedValue: 60,
            updateDate: updateDate1,
            comment: 'First update',
        });

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 70,
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
        expect(updates.page.map(u => u.updatedValue)).toContain(60);
        expect(updates.page.map(u => u.updatedValue)).toContain(70);
    });

    test('updateUpdateProgress modifies an existing update', async () => {
        const updateDate = Date.now();
        const progressUpdateId = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
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
