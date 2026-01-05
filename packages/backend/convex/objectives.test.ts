import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from './test_helpers';

describe('convex objectives', async () => {
    const t = convexTest(schema, modules);
    let userId: string;
    const DAY_MS = 24 * 60 * 60 * 1000;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        const result = await userIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: 'test-password',
                role: 'admin',
                emailVerified: false,
            });
        });
        userId = result.userId;
    });

    test('createObjective creates a new objective', async () => {
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Save for vacation',
            description: 'Initial savings goal',
            category: 'finance',
            targetValue: 2000,
            currentValue: 250,
            deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'not_started',
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
        expect(objective?.status).toBe('not_started');
        expect(objective?.unit).toBe('EUR');
        expect(objective?.objectiveType).toBe('money');
        expect(objective?.period).toBe('monthly');
        expect(objective?.user).toBe(userId);
    });

    test('getObjectiveById computes period progress for event-based objectives', async () => {
        const now = Date.now();
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Gym visits',
            targetValue: 3,
            currentValue: 0,
            status: 'in_progress',
            objectiveType: 'count',
            period: 'custom',
            periodStart: now - 2 * DAY_MS,
            periodLengthDays: 7,
        });

        await userIdentity.run(async ctx => {
            await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                updatedValue: 1,
                updateDate: now - DAY_MS,
                createdAt: now,
                updatedAt: now,
            });
            await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                updatedValue: 2,
                updateDate: now - 10 * DAY_MS,
                createdAt: now,
                updatedAt: now,
            });
        });

        const objective = await userIdentity.query(api.objectives.getObjectiveById, {
            id: objectiveId,
        });

        expect(objective?.currentValue).toBe(1);
    });

    test("getObjectivesByUser returns user's objectives", async () => {
        // Get initial count to account for objectives from previous tests
        const initialObjectives = await userIdentity.query(api.objectives.getObjectivesByUser, {});
        const initialCount = initialObjectives.length;

        // Create multiple objectives
        const obj1 = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Objective 1',
            targetValue: 100,
            currentValue: 50,
            status: 'in_progress',
        });

        const obj2 = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Objective 2',
            targetValue: 200,
            currentValue: 100,
            status: 'not_started',
        });

        const objectives = await userIdentity.query(api.objectives.getObjectivesByUser, {});

        expect(objectives).toHaveLength(initialCount + 2);
        expect(objectives.map(o => o._id)).toContain(obj1);
        expect(objectives.map(o => o._id)).toContain(obj2);
    });

    test('getObjectiveById returns a specific objective', async () => {
        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Test Objective',
            targetValue: 100,
            currentValue: 50,
            status: 'in_progress',
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
                user: userId,
                title: 'Save for vacation',
                description: 'Initial savings goal',
                category: 'finance',
                targetValue: 2000,
                currentValue: 250,
                deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
                status: 'not_started',
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
            status: 'in_progress',
            unit: 'EUR',
        });

        const updated = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(updated?.title).toBe('Save for summer vacation');
        expect(updated?.description).toBe('Monthly savings');
        expect(updated?.category).toBe('finance');
        expect(updated?.currentValue).toBe(350);
        expect(typeof updated?.deadline).toBe('number');
        expect(updated?.status).toBe('in_progress');
        expect(updated?.unit).toBe('EUR');
        expect(typeof updated?.updatedAt).toBe('number');
    });

    test('deleteObjective removes the document', async () => {
        const { objectiveId } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                user: userId,
                title: 'Lose 5kg',
                description: 'Cut sugar & run 3x/week',
                category: 'health',
                targetValue: 5,
                currentValue: 1,
                deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
                status: 'not_started',
                unit: 'kg',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId: id };
        });

        await userIdentity.mutation(api.objectives.deleteObjective, { id: objectiveId });
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
            status: 'not_started',
            unit: 'books',
        };
        const { objectiveId } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                user: userId,
                ...initial,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return { objectiveId: id };
        });

        await userIdentity.mutation(api.objectives.updateObjective, {
            id: objectiveId,
            status: 'in_progress',
        });

        const after = await userIdentity.run(async ctx => ctx.db.get(objectiveId));
        expect(after?.status).toBe('in_progress');
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
                status: 'not_started',
                unit: undefined,
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test('getObjectivesByUser rejects when unauthenticated', async () => {
        await expect(t.query(api.objectives.getObjectivesByUser, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test('updateObjective updates updatedAt timestamp', async () => {
        const { objectiveId, initialUpdatedAt } = await userIdentity.run(async ctx => {
            const id = await ctx.db.insert('objectives', {
                user: userId,
                title: 'Test',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
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
                user: userId,
                title: 'temp',
                targetValue: 1,
                currentValue: 0,
                status: 'not_started',
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
