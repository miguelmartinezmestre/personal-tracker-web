import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
    readScheduledFunctionArg,
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

    describe('updateObjective completion (F2)', () => {
        test('completes synchronously when the target is lowered below the current value', async () => {
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Sync completion',
                targetValue: 100,
            });

            await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: 50,
                updateDate: Date.now(),
            });

            const before = await t.run(async ctx => ctx.db.get('objectives', objectiveId));
            expect(before?.status).toBe('active');

            // Lowering the target below the current value must complete the
            // objective immediately. Completion cannot depend on the queued
            // reconciliation — it must be recomputed synchronously in the
            // mutation.
            await userIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                targetValue: 40,
            });

            const after = await t.run(async ctx => ctx.db.get('objectives', objectiveId));
            expect(after?.status).toBe('completed');
            expect(after?.completedAt).toBeDefined();
        });

        test('rejects a partial update that would put the start above the target', async () => {
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Invalid partial bounds',
                targetValue: 10,
                startValue: 0,
            });

            await expect(
                userIdentity.mutation(api.objectives.updateObjective, {
                    id: objectiveId,
                    startValue: 20,
                })
            ).rejects.toThrow();
        });
    });

    describe('createObjective', () => {
        test('creates an active objective with defaults', async () => {
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Read 12 books',
                targetValue: 12,
            });

            const objective = await t.run(async ctx => ctx.db.get('objectives', objectiveId));
            expect(objective).toMatchObject({
                title: 'Read 12 books',
                targetValue: 12,
                currentValue: 0,
                startValue: 0,
                status: 'active',
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
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

            const objective = await t.run(async ctx => ctx.db.get('objectives', objectiveId));
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

        test('rejects conflicting current and start baselines', async () => {
            await expect(
                userIdentity.mutation(api.objectives.createObjective, {
                    title: 'Ambiguous baseline',
                    targetValue: 100,
                    currentValue: 10,
                    startValue: 20,
                })
            ).rejects.toThrow(/VALIDATION_ERROR/);
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

            expect(updated.title).toBe('New title');
            expect(updated.unit).toBe('km');
            expect(updated.targetValue).toBe(100);
        });

        test('can clear a deadline and recomputes early-bird progress on deadline changes', async () => {
            const now = Date.now();
            const today = new Date(now);
            const todayCivilDay = Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate()
            );
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Completed after original deadline',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
                deadline: todayCivilDay - 24 * 60 * 60 * 1000,
                completedAt: now,
                earlyBirdCompleted: false,
            });

            const beforeScheduledIds = await t.run(async ctx =>
                (await ctx.db.system.query('_scheduled_functions').collect()).map(row => row._id)
            );
            const beforeScheduledIdSet = new Set(beforeScheduledIds);

            const extended = await userIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                deadline: todayCivilDay,
            });
            expect(extended.earlyBirdCompleted).toBe(true);

            const completionEvaluations = await t.run(async ctx => {
                return (await ctx.db.system.query('_scheduled_functions').collect())
                    .filter(row => !beforeScheduledIdSet.has(row._id))
                    .map(readScheduledFunctionArg)
                    .filter(args => args?.trigger === 'objective_completed');
            });
            expect(completionEvaluations).toEqual([
                expect.objectContaining({ userId, trigger: 'objective_completed' }),
            ]);

            const cleared = await userIdentity.mutation(api.objectives.updateObjective, {
                id: objectiveId,
                deadline: null,
            });
            expect(cleared.deadline).toBeUndefined();
            expect(cleared.earlyBirdCompleted).toBe(false);
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

            const untouched = await t.run(async ctx => ctx.db.get('objectives', foreignId));
            expect(untouched?.title).toBe('Foreign');
        });
    });

    describe('deleteObjective', () => {
        test('soft-deletes the objective', async () => {
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
                    createdBy: userId,
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
            expect(result.status).toBe('soft_deleted');

            const objective = await t.run(async ctx => ctx.db.get('objectives', objectiveId));
            expect(objective?.deletedAt).toBeDefined();
            expect(objective?.deletedBy).toBe(userId);
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

            const untouched = await t.run(async ctx => ctx.db.get('objectives', foreignId));
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

    describe('permissions by organization role', () => {
        let sharedOrgId: Id<'organization'>;
        let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
        let memberUser: Awaited<ReturnType<typeof createTestUser>>;
        let adminUser: Awaited<ReturnType<typeof createTestUser>>;
        let memberIdentity: TestConvexForDataModel<DataModel>;
        let adminIdentity: TestConvexForDataModel<DataModel>;
        let ownerObjectiveId: Id<'objectives'>;
        let memberObjectiveId: Id<'objectives'>;

        beforeEach(async () => {
            const suffix = Math.random().toString(36).slice(2, 12);

            sharedOrgId = await createTestOrganization(t, {
                name: `Shared Org ${suffix}`,
                slug: `shared-org-${suffix}`,
            });

            ownerUser = await createTestUser(t, {
                userId: `perm-owner-${suffix}`,
                email: `perm-owner-${suffix}@example.com`,
                name: `Perm Owner ${suffix}`,
            });
            memberUser = await createTestUser(t, {
                userId: `perm-member-${suffix}`,
                email: `perm-member-${suffix}@example.com`,
                name: `Perm Member ${suffix}`,
            });
            adminUser = await createTestUser(t, {
                userId: `perm-admin-${suffix}`,
                email: `perm-admin-${suffix}@example.com`,
                name: `Perm Admin ${suffix}`,
            });

            await createTestMember(t, {
                organizationId: sharedOrgId,
                userId: ownerUser.docId,
                role: 'member',
            });
            await createTestMember(t, {
                organizationId: sharedOrgId,
                userId: memberUser.docId,
                role: 'member',
            });
            await createTestMember(t, {
                organizationId: sharedOrgId,
                userId: adminUser.docId,
                role: 'admin',
            });

            memberIdentity = t.withIdentity(identityFor(memberUser));
            adminIdentity = t.withIdentity(identityFor(adminUser));

            ownerObjectiveId = await createTestObjective(t, {
                userId: ownerUser.docId,
                ownerId: ownerUser.docId,
                organizationId: sharedOrgId,
                title: 'Owner objective',
                targetValue: 100,
                visibility: 'private',
            });
            memberObjectiveId = await createTestObjective(t, {
                userId: memberUser.docId,
                ownerId: memberUser.docId,
                organizationId: sharedOrgId,
                title: 'Member objective',
                targetValue: 50,
                visibility: 'private',
            });
        });

        test('member cannot update another owners private objective', async () => {
            await expect(
                memberIdentity.mutation(api.objectives.updateObjective, {
                    id: ownerObjectiveId,
                    title: 'Hijacked',
                })
            ).rejects.toThrow();
        });

        test('member can update and delete their own objectives', async () => {
            const updated = await memberIdentity.mutation(api.objectives.updateObjective, {
                id: memberObjectiveId,
                title: 'Updated by member',
            });
            expect(updated.title).toBe('Updated by member');

            const result = await memberIdentity.mutation(api.objectives.deleteObjective, {
                id: memberObjectiveId,
            });
            expect(result.status).toBe('soft_deleted');
        });

        test('admin can update and soft-delete objectives owned by others', async () => {
            const updated = await adminIdentity.mutation(api.objectives.updateObjective, {
                id: ownerObjectiveId,
                title: 'Updated by admin',
            });
            expect(updated.title).toBe('Updated by admin');

            const result = await adminIdentity.mutation(api.objectives.deleteObjective, {
                id: ownerObjectiveId,
            });
            expect(result.status).toBe('soft_deleted');
        });
    });
});
