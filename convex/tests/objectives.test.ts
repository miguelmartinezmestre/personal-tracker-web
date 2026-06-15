import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { identityFor } from './test_identities';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('convex objectives', () => {
    const t = initConvexTest();

    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;
    let otherOrgId: Id<'organization'>;
    let otherUserId: Id<'user'>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 12);

        organizationId = await createTestOrganization(t, {
            name: `Objectives Org ${suffix}`,
            slug: `objectives-org-${suffix}`,
        });
        otherOrgId = await createTestOrganization(t, {
            name: `Objectives Other Org ${suffix}`,
            slug: `objectives-other-org-${suffix}`,
        });

        const user = await createTestUser(t, {
            userId: `objectives-user-${suffix}`,
            email: `objectives-user-${suffix}@example.com`,
            name: `Objectives User ${suffix}`,
            password: 'test-password',
            role: 'user',
        });
        userId = user.docId;

        const otherUser = await createTestUser(t, {
            userId: `objectives-other-${suffix}`,
            email: `objectives-other-${suffix}@example.com`,
            name: `Objectives Other ${suffix}`,
            password: 'test-password',
            role: 'user',
        });
        otherUserId = otherUser.docId;

        await createTestMember(t, { organizationId, userId, role: 'owner' });
        await createTestMember(t, {
            organizationId: otherOrgId,
            userId: otherUserId,
            role: 'owner',
        });

        userIdentity = t.withIdentity(identityFor(user));
    });

    describe('createObjective', () => {
        test('creates an active objective with defaults', async () => {
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Read 12 books',
                targetValue: 12,
            });

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective).toMatchObject({
                title: 'Read 12 books',
                targetValue: 12,
                currentValue: 0,
                startValue: 0,
                status: 'active',
                userId,
                organizationId,
            });
            expect(objective?.completedAt).toBeUndefined();
        });

        test('marks the objective completed when the start value reaches the target', async () => {
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Already done',
                targetValue: 10,
                currentValue: 10,
            });

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective?.status).toBe('completed');
            expect(objective?.completedAt).toBeDefined();
        });

        test('rejects an empty title', async () => {
            await expect(
                userIdentity.mutation(api.objectives.createObjective, {
                    title: '   ',
                    targetValue: 5,
                })
            ).rejects.toThrow();
        });

        test('rejects invalid metrics', async () => {
            await expect(
                userIdentity.mutation(api.objectives.createObjective, {
                    title: 'Bad target',
                    targetValue: Number.NaN,
                })
            ).rejects.toThrow();
        });

        test('rejects unauthenticated callers', async () => {
            await expect(
                t.mutation(api.objectives.createObjective, {
                    title: 'No auth',
                    targetValue: 5,
                })
            ).rejects.toThrow();
        });
    });

    describe('getObjectives', () => {
        test('paginates objectives of the active organization', async () => {
            for (let i = 0; i < 3; i++) {
                await createTestObjective(t, {
                    userId,
                    organizationId,
                    title: `Objective ${i}`,
                    targetValue: 100,
                });
            }

            const firstPage = await userIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { numItems: 2, cursor: null },
            });
            expect(firstPage.page).toHaveLength(2);
            expect(firstPage.isDone).toBe(false);

            const secondPage = await userIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { numItems: 2, cursor: firstPage.continueCursor },
            });
            expect(secondPage.page).toHaveLength(1);
            expect(secondPage.isDone).toBe(true);
        });

        test('filters by status', async () => {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Active one',
                targetValue: 100,
            });
            await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Completed one',
                targetValue: 10,
                currentValue: 10,
                status: 'completed',
            });

            const completed = await userIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { numItems: 10, cursor: null },
                status: 'completed',
            });
            expect(completed.page).toHaveLength(1);
            expect(completed.page[0]?.title).toBe('Completed one');
        });

        test('does not leak objectives from another organization', async () => {
            await createTestObjective(t, {
                userId: otherUserId,
                organizationId: otherOrgId,
                title: 'Foreign objective',
                targetValue: 100,
            });

            const result = await userIdentity.query(api.objectives.getObjectives, {
                paginationOpts: { numItems: 10, cursor: null },
            });
            expect(result.page).toHaveLength(0);
        });
    });

    describe('getObjectiveById', () => {
        test('returns an objective of the active organization', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Mine',
                targetValue: 100,
            });

            const objective = await userIdentity.query(api.objectives.getObjectiveById, {
                id: objectiveId,
            });
            expect(objective?.title).toBe('Mine');
        });

        test('does not expose objectives from another organization', async () => {
            const foreignId = await createTestObjective(t, {
                userId: otherUserId,
                organizationId: otherOrgId,
                title: 'Foreign',
                targetValue: 100,
            });

            try {
                const objective = await userIdentity.query(api.objectives.getObjectiveById, {
                    id: foreignId,
                });
                expect(objective).toBeNull();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('updateObjective', () => {
        test('patches the provided fields', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Old title',
                targetValue: 100,
            });

            const updated = await userIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                title: 'New title',
                unit: 'km',
            });

            expect(updated?.title).toBe('New title');
            expect(updated?.unit).toBe('km');
            expect(updated?.targetValue).toBe(100);
        });

        test('rejects an empty title', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Valid',
                targetValue: 100,
            });

            await expect(
                userIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    title: ' ',
                })
            ).rejects.toThrow();
        });

        test('denies updates to objectives of another organization', async () => {
            const foreignId = await createTestObjective(t, {
                userId: otherUserId,
                organizationId: otherOrgId,
                title: 'Foreign',
                targetValue: 100,
            });

            await expect(
                userIdentity.mutation(api.objectives.updateObjective, {
                    id: foreignId,
                    title: 'Hijacked',
                })
            ).rejects.toThrow();

            const untouched = await t.run(async ctx => ctx.db.get(foreignId));
            expect(untouched?.title).toBe('Foreign');
        });
    });

    describe('deleteObjective', () => {
        test('deletes the objective with its progress updates', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'To delete',
                targetValue: 100,
            });
            await t.run(async ctx => {
                const now = Date.now();
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId,
                    organizationId,
                    updatedValue: 10,
                    updateDate: now,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await userIdentity.mutation(api.objectives.deleteObjective, {
                id: objectiveId,
            });
            expect(result.objectiveId).toBe(objectiveId);

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective).toBeNull();
        });

        test('denies deleting objectives of another organization', async () => {
            const foreignId = await createTestObjective(t, {
                userId: otherUserId,
                organizationId: otherOrgId,
                title: 'Foreign',
                targetValue: 100,
            });

            await expect(
                userIdentity.mutation(api.objectives.deleteObjective, { id: foreignId })
            ).rejects.toThrow();

            const untouched = await t.run(async ctx => ctx.db.get(foreignId));
            expect(untouched).not.toBeNull();
        });
    });

    describe('searchObjectivesQuery', () => {
        test('finds objectives by title within the active organization only', async () => {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Marathon training plan',
                targetValue: 42,
            });
            await createTestObjective(t, {
                userId: otherUserId,
                organizationId: otherOrgId,
                title: 'Marathon training plan',
                targetValue: 42,
            });

            const results = await userIdentity.query(api.objectives.searchObjectivesQuery, {
                search: 'Marathon',
            });

            expect(results).toHaveLength(1);
            expect(results[0]?.organizationId).toBe(organizationId);
        });

        test('applies the status filter to search results', async () => {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Marathon active',
                targetValue: 42,
            });
            await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Marathon finished',
                targetValue: 10,
                currentValue: 10,
                status: 'completed',
            });

            const results = await userIdentity.query(api.objectives.searchObjectivesQuery, {
                search: 'Marathon',
                status: 'completed',
            });

            expect(results).toHaveLength(1);
            expect(results[0]?.title).toBe('Marathon finished');
        });
    });
});
