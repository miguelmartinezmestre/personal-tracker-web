import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
import { ERROR_CODES, TIME } from '../utils/constants';

describe('Domain validation at backend boundaries', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: `test-user-domain-${randomSuffix}`,
            email: `domain-test@example.com-${randomSuffix}`,
            name: `Domain Test User ${randomSuffix}`,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: `Domain Test Org ${randomSuffix}`,
            slug: `domain-test-org-${randomSuffix}`,
        });

        await createTestMember(t, {
            organizationId,
            userId,
            role: 'owner',
        });

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
    });

    async function insertObjective(status: 'active' | 'completed' = 'active') {
        return await userIdentity.run(async ctx => {
            const now = Date.now();
            return await ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId,
                title: `${status} Test Objective`,
                targetValue: 100,
                currentValue: status === 'completed' ? 100 : 50,
                startValue: status === 'completed' ? 0 : 50,
                status,
                deadline: status === 'completed' ? now + TIME.DAY_MS : undefined,
                completedAt: status === 'completed' ? now : undefined,
                earlyBirdCompleted: status === 'completed',
                createdAt: now,
                updatedAt: now,
            });
        });
    }

    test.each([
        {
            description: 'future date',
            overrides: { updateDate: Date.now() + 2 * TIME.DAY_MS },
            expectedError: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
        },
        {
            description: 'negative progress',
            overrides: { updatedValue: -1 },
            expectedError: ERROR_CODES.VALUE_NEGATIVE,
        },
        {
            description: 'non-finite update date',
            overrides: { updateDate: Number.NaN },
            expectedError: ERROR_CODES.VALIDATION_ERROR,
        },
    ])('createUpdateProgress rejects $description', async ({ overrides, expectedError }) => {
        const activeObjectiveId = await insertObjective();

        await expect(
            userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: activeObjectiveId,
                updatedValue: 10,
                updateDate: Date.now(),
                ...overrides,
            })
        ).rejects.toThrow(expectedError);
    });

    test('createUpdateProgress rejects progress on a completed objective', async () => {
        const completedObjectiveId = await insertObjective('completed');

        await expect(
            userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: completedObjectiveId,
                updatedValue: 10,
                updateDate: Date.now(),
            })
        ).rejects.toThrow(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    });

    test('createUpdateProgress accepts valid progress on an active objective', async () => {
        const activeObjectiveId = await insertObjective();

        const result = await userIdentity.mutation(api.update_progress.createUpdateProgress, {
            objective: activeObjectiveId,
            updatedValue: 10,
            updateDate: Date.now(),
        });

        expect(result).toBeDefined();
        expect(result?.updatedValue).toBe(10);
    });

    test('updateUpdateProgress can reopen a completed objective', async () => {
        const completedObjectiveId = await insertObjective('completed');

        const progressUpdateId = await userIdentity.run(async ctx => {
            return await ctx.db.insert('progressUpdates', {
                objective: completedObjectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 100,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        const updated = await userIdentity.mutation(api.update_progress.updateUpdateProgress, {
            id: progressUpdateId,
            updatedValue: 50,
            updateDate: Date.now(),
        });
        expect(updated?.updatedValue).toBe(50);

        const objective = await userIdentity.run(async ctx =>
            ctx.db.get('objectives', completedObjectiveId)
        );
        expect(objective?.status).toBe('active');
        expect(objective?.earlyBirdCompleted).toBe(false);
    });

    test('deleteUpdateProgress can reopen a completed objective', async () => {
        const completedObjectiveId = await insertObjective('completed');
        const progressUpdateId = await userIdentity.run(async ctx => {
            return await ctx.db.insert('progressUpdates', {
                objective: completedObjectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 100,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        await userIdentity.mutation(api.update_progress.deleteUpdateProgress, {
            _id: progressUpdateId,
        });

        const objective = await userIdentity.run(async ctx =>
            ctx.db.get('objectives', completedObjectiveId)
        );
        expect(objective?.status).toBe('active');
        expect(objective?.completedAt).toBeUndefined();
        expect(objective?.earlyBirdCompleted).toBe(false);
    });

    test.each([
        {
            description: 'future date',
            overrides: { updateDate: Date.now() + 2 * TIME.DAY_MS },
            expectedError: ERROR_CODES.FUTURE_DATE_NOT_ALLOWED,
        },
        {
            description: 'negative progress',
            overrides: { updatedValue: -1 },
            expectedError: ERROR_CODES.VALUE_NEGATIVE,
        },
        {
            description: 'non-finite update date',
            overrides: { updateDate: Number.NaN },
            expectedError: ERROR_CODES.VALIDATION_ERROR,
        },
    ])('updateUpdateProgress rejects $description', async ({ overrides, expectedError }) => {
        const activeObjectiveId = await insertObjective();
        const progressUpdateId = await userIdentity.run(async ctx => {
            return await ctx.db.insert('progressUpdates', {
                objective: activeObjectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 60,
                updateDate: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        await expect(
            userIdentity.mutation(api.update_progress.updateUpdateProgress, {
                id: progressUpdateId,
                updatedValue: 70,
                updateDate: Date.now(),
                ...overrides,
            })
        ).rejects.toThrow(expectedError);
    });

    test.each([
        {
            description: 'target value too small',
            args: { targetValue: 0.0001 },
            expectedError: ERROR_CODES.TARGET_TOO_SMALL,
        },
        {
            description: 'negative current value',
            args: { currentValue: -1 },
            expectedError: ERROR_CODES.VALUE_NEGATIVE,
        },
    ])('createObjective rejects $description', async ({ args, expectedError }) => {
        await expect(
            userIdentity.mutation(api.objectives.createObjective, {
                title: 'Test Objective',
                targetValue: args.targetValue ?? 100,
                currentValue: args.currentValue,
            })
        ).rejects.toThrow(expectedError);
    });
});
