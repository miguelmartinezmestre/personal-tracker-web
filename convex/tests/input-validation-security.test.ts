import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { Id, DataModel } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { ERROR_CODES } from '../utils/constants';

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
            role: 'admin',
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
                id: malformedId as unknown as Id<'objectives'>,
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
                objectiveId: malformedId as unknown as Id<'objectives'>,
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.mutation(api.notifications.setNotificationRead, {
                id: malformedId as unknown as Id<'notifications'>,
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
                name: { $ne: '' } as unknown as string,
                color: '#10b981',
            })
        ).rejects.toThrow();

        await expect(
            userIdentity.mutation(api.objectives.createObjective, {
                title: { $regex: '.*' } as unknown as string,
                targetValue: { $gt: 0 } as unknown as number,
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

        const progressUpdates = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', objectiveId))
                .collect();
        });

        expect(progressUpdates).toHaveLength(0);
    });
});
