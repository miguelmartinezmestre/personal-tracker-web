import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import type { Id, DataModel } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import { asInvalidArg } from './testCasts';
import { ERROR_CODES } from '../utils/constants';
import {
    CATEGORY_NAME_MAX_LENGTH,
    OBJECTIVE_DESCRIPTION_MAX_LENGTH,
    OBJECTIVE_TITLE_MAX_LENGTH,
    OBJECTIVE_UNIT_MAX_LENGTH,
    PROGRESS_COMMENT_MAX_LENGTH,
} from '../../shared/input-constraints';

describe('input validation security', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'input-validation-user-' + random,
            email: 'input-validation@example.com-' + random,
            name: 'Input Validation User ' + random,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        };
        const userData = await createTestUser(t, user);
        userId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Input Validation Org ' + random,
            slug: 'input-validation-org-' + random,
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

    test('rejects object payloads for ID arguments', async () => {
        const malformedId = { $ne: '' };

        await expect(
            userIdentity.query(api.objectives.getObjectiveById, {
                id: asInvalidArg<Id<'objectives'>>(malformedId),
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
                objectiveId: asInvalidArg<Id<'objectives'>>(malformedId),
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.mutation(api.notifications.setNotificationRead, {
                id: asInvalidArg<Id<'notifications'>>(malformedId),
                read: true,
            })
        ).rejects.toThrow();
    });

    test('rejects object payloads for scalar creation fields without creating documents', async () => {
        const categoryCountBefore = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('categories')
                .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                .collect();
        });

        await expect(
            userIdentity.mutation(api.categories.createCategory, {
                name: asInvalidArg<string>({ $ne: '' }),
                color: '#10b981',
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.mutation(api.objectives.createObjective, {
                title: asInvalidArg<string>({ $regex: '.*' }),
                targetValue: asInvalidArg<number>({ $gt: 0 }),
            })
        ).rejects.toThrow();

        const categoryCountAfter = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('categories')
                .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                .collect();
        });
        const objectiveCountAfter = await userIdentity.run(async ctx => {
            const allObjectives = await ctx.db.query('objectives').collect();
            return allObjectives.filter(objective => objective.organizationId === organizationId);
        });

        expect(categoryCountAfter).toHaveLength(categoryCountBefore.length);
        expect(objectiveCountAfter).toHaveLength(0);
    });

    test('enforces category semantic constraints on create and update', async () => {
        for (const invalid of [
            { name: 'x'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), color: '#10b981' },
            { name: 'Invalid color', color: 'blue' },
            { name: 'Invalid icon', color: '#10b981', icon: 'not-an-icon' },
        ]) {
            await expect(
                userIdentity.mutation(api.categories.createCategory, invalid)
            ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
        }

        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Valid category',
            color: '#10b981',
            icon: 'tag',
        });
        await expect(
            userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                color: '#xyzxyz',
            })
        ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
        await expect(
            userIdentity.mutation(api.categories.updateCategory, {
                id: categoryId,
                icon: 'invalid',
            })
        ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);

        const category = await userIdentity.run(ctx => ctx.db.get('categories', categoryId));
        expect(category).toMatchObject({ name: 'Valid category', color: '#10b981', icon: 'tag' });
    });

    test('enforces bounded objective text on create and update', async () => {
        const invalidCreates = [
            { title: 'x'.repeat(OBJECTIVE_TITLE_MAX_LENGTH + 1), targetValue: 10 },
            {
                title: 'Valid title',
                description: 'x'.repeat(OBJECTIVE_DESCRIPTION_MAX_LENGTH + 1),
                targetValue: 10,
            },
            {
                title: 'Valid title',
                unit: 'x'.repeat(OBJECTIVE_UNIT_MAX_LENGTH + 1),
                targetValue: 10,
            },
        ];
        for (const invalid of invalidCreates) {
            await expect(
                userIdentity.mutation(api.objectives.createObjective, invalid)
            ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
        }

        const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: '  Trimmed title  ',
            targetValue: 10,
        });
        await expect(
            userIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                description: 'x'.repeat(OBJECTIVE_DESCRIPTION_MAX_LENGTH + 1),
            })
        ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
        const objective = await userIdentity.run(ctx => ctx.db.get('objectives', objectiveId));
        expect(objective).toMatchObject({ title: 'Trimmed title' });
        expect(objective?.description).toBeUndefined();
    });

    test('does not create progress records when validation rejects the update', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Validation Rollback Objective',
            targetValue: 100,
            currentValue: 0,
        });

        await expect(
            userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: -1,
                updateDate: Date.now(),
            })
        ).rejects.toThrow(ERROR_CODES.VALUE_NEGATIVE);
        await expect(
            userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: 1,
                updateDate: Date.now(),
                comment: 'x'.repeat(PROGRESS_COMMENT_MAX_LENGTH + 1),
            })
        ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);

        const progressUpdates = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
                .collect();
        });

        expect(progressUpdates).toHaveLength(0);
    });
});
