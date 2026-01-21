import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from '../../better-auth.helper';
import { createTestUser, createTestOrganization, createTestMember } from '../../test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';

describe('convex objectives', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let organizationId: string;
    const DAY_MS = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-objectives-' + randomSuffix,
            email: 'objectives-test@example.com-' + randomSuffix,
            name: 'Objectives Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };

        await createTestUser(t, user);
        userId = user.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Objectives Org ' + randomSuffix,
            slug: 'objectives-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        organizationId = String(orgId);

        userIdentity = t.withIdentity({
            subject: user.userId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: user.userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('createObjective creates a new objective', async () => {
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Save for vacation',
            description: 'Initial savings goal',
            category: 'finance',
            targetValue: 2000,
            currentValue: 250,
            deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
            unit: 'EUR',
            objectiveType: 'money',
            period: 'monthly',
        });

        expect(objectiveId).toBeDefined();

        const objective = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(objective?.title).toBe('Save for vacation');
        expect(objective?.description).toBe('Initial savings goal');
        expect(objective?.category).toBe('finance');
        expect(objective?.targetValue).toBe(2000);
        expect(objective?.currentValue).toBe(250);
        expect(objective?.status).toBe('active');
        expect(objective?.unit).toBe('EUR');
        expect(objective?.objectiveType).toBe('money');
        expect(objective?.period).toBe('monthly');
        expect(objective?.userId).toBe(userId);
    });

    test('getObjectiveById reflects period progress for event-based objectives', async () => {
        const now = Date.now();
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Gym visits',
            targetValue: 3,
            currentValue: 0,
            objectiveType: 'count',
            period: 'custom',
            periodStart: now - 2 * DAY_MS,
            periodLengthDays: 7,
        });

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 1,
            updateDate: now - DAY_MS,
        });

        await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: objectiveId,
            updatedValue: 2,
            updateDate: now - 10 * DAY_MS,
        });

        const objective = await userIdentity.query(api.objectives.getObjectiveById, {
            id: objectiveId,
        });

        expect(objective?.currentValue).toBe(1);
    });

    test("getObjectivesByUser returns user's objectives", async () => {
        // Get initial count to account for objectives from previous tests
        const initialObjectives = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        const initialCount = initialObjectives.page.length;

        // Create multiple objectives
        const obj1 = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Objective 1',
            targetValue: 100,
            currentValue: 50,
        });

        const obj2 = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Objective 2',
            targetValue: 200,
            currentValue: 100,
        });

        const objectives = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(objectives.page.length).toBe(initialCount + 2);
        expect(objectives.page.some(o => o._id === obj1)).toBe(true);
        expect(objectives.page.some(o => o._id === obj2)).toBe(true);
    });

    test('getObjectiveById returns a specific objective', async () => {
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Test Objective',
            targetValue: 100,
            currentValue: 50,
        });

        const objective = await userIdentity.query(api.objectives.getObjectiveById, {
            id: objectiveId,
        });

        expect(objective?._id).toBe(objectiveId);
        expect(objective?.title).toBe('Test Objective');
    });

    test('updateObjective patches realistic fields', async () => {
        const { objectiveId } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                userId: userId,
                organizationId: organizationId,
                title: 'Save for vacation',
                description: 'Initial savings goal',
                category: 'finance',
                targetValue: 2000,
                currentValue: 250,
                deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
                status: 'active',
                unit: 'EUR',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId: id };
        });

        await userIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            title: 'Save for summer vacation',
            description: 'Monthly savings',
            category: 'finance',
            currentValue: 350,
            deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
            unit: 'EUR',
        });

        const updated = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(updated?.title).toBe('Save for summer vacation');
        expect(updated?.description).toBe('Monthly savings');
        expect(updated?.category).toBe('finance');
        expect(updated?.currentValue).toBe(350);
        expect(typeof updated?.deadline).toBe('number');
        expect(updated?.status).toBe('active');
        expect(updated?.unit).toBe('EUR');
        expect(typeof updated?.updatedAt).toBe('number');
    });

    test('deleteObjective removes the document', async () => {
        const { objectiveId } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                userId: userId,
                organizationId: organizationId,
                title: 'Lose 5kg',
                description: 'Cut sugar & run 3x/week',
                category: 'health',
                targetValue: 5,
                currentValue: 1,
                deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
                status: 'active',
                unit: 'kg',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId: id };
        });

        // Use hardDeleteObjective for permanent removal (deleteObjective only soft deletes)
        await userIdentity.mutation(api.objectives.hardDeleteObjective, { id: objectiveId });
        const doc = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(doc).toBeNull();
    });

    test('partial update preserves unspecified fields', async () => {
        const initial = {
            title: 'Read 12 books',
            description: '1 book per month',
            category: 'education',
            targetValue: 12,
            currentValue: 3,
            deadline: Date.now() + 365 * 24 * 60 * 60 * 1000,
            status: 'active',
            unit: 'books',
        };
        const { objectiveId } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                userId: userId,
                organizationId: organizationId,
                ...initial,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId: id };
        });

        await userIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
        });

        const after = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(after?.status).toBe('active');
        expect(after?.title).toBe(initial.title);
        expect(after?.description).toBe(initial.description);
        expect(after?.category).toBe(initial.category);
        expect(after?.targetValue).toBe(initial.targetValue);
        expect(after?.currentValue).toBe(initial.currentValue);
        expect(after?.deadline).toBeTypeOf('number');
        expect(after?.unit).toBe(initial.unit);
    });

    test('createObjective rejects when unauthenticated', async () => {
        await expect(
            t.mutation(api.objectives.createObjective, {
                title: 'x',
                description: undefined,
                category: undefined,
                targetValue: 1,
                currentValue: 0,
                deadline: undefined,
                unit: undefined,
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test('getObjectivesByUser rejects when unauthenticated', async () => {
        await expect(
            t.query(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test('updateObjective updates updatedAt timestamp', async () => {
        const { objectiveId, initialUpdatedAt } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                userId: userId,
                organizationId: organizationId,
                title: 'Test',
                targetValue: 100,
                currentValue: 50,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now() - 1000, // 1 second ago
            });
            const obj = await ctx.db.get(id);
            return { objectiveId: id, initialUpdatedAt: obj?.updatedAt };
        });

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        await userIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            currentValue: 75,
        });

        const updated = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(updated?.updatedAt).toBeGreaterThan(initialUpdatedAt!);
    });

    test('getObjectiveById returns null for non-existent objective', async () => {
        // Create a valid ID format for objectives table
        const fakeId = await userIdentity.run(async ctx => {
            // Create a temporary objective to get a valid ID format, then delete it
            const tempId = await ctx.db.insert('objectives', {
                userId: userId,
                organizationId: organizationId,
                title: 'temp',
                targetValue: 1,
                currentValue: 0,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await ctx.db.delete(tempId);
            // Return a non-existent but valid format ID
            return tempId;
        });

        const objective = await userIdentity.query(api.objectives.getObjectiveById, {
            id: fakeId,
        });

        expect(objective).toBeNull();
    });
});
