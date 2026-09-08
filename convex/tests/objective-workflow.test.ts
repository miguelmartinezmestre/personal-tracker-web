import { describe, expect, test } from 'vitest';
import type { WorkflowId } from '@convex-dev/workflow';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';
import { asInvalidArg } from './testCasts';

describe('objective workflow lifecycle', () => {
    test.each([
        { state: 'soft-deleted', patch: { deletedAt: Date.now() } },
        { state: 'being purged', patch: { purgeToken: 'pending-purge' } },
    ])('does not reconcile or notify for an objective that is $state', async ({ patch }) => {
        const t = initConvexTest({ workflow: true });
        const suffix = Math.random().toString(36).slice(2);
        const user = await createTestUser(t, {
            userId: `stale-objective-sync-${suffix}`,
            email: `stale-objective-sync-${suffix}@example.com`,
            name: 'Stale Objective Sync User',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Stale Objective Sync Org ${suffix}`,
            slug: `stale-objective-sync-org-${suffix}`,
        });
        const now = Date.now();
        const objectiveId = await t.run(async ctx =>
            ctx.db.insert('objectives', {
                createdBy: user.docId,
                ownerId: user.docId,
                visibility: 'private',
                organizationId,
                title: 'Logically absent objective',
                targetValue: 100,
                currentValue: 100,
                startValue: 0,
                status: 'active',
                earlyBirdCompleted: false,
                createdAt: now,
                updatedAt: now,
                ...patch,
            })
        );

        const result = await t.mutation(
            internal.jobs.objectives.syncObjectiveFromProgress.syncObjectiveFromProgress,
            { objectiveId }
        );
        const state = await t.run(async ctx => ({
            objective: await ctx.db.get('objectives', objectiveId),
            notifications: await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', user.docId).eq('organizationId', organizationId)
                )
                .collect(),
        }));

        expect(result).toMatchObject({ found: false, completedNow: false, reopened: false });
        expect(state.objective?.status).toBe('active');
        expect(state.notifications).toEqual([]);
    });

    test('does not clear a newer objective workflow id when an older workflow completes', async () => {
        const t = initConvexTest({ workflow: true });
        const suffix = Math.random().toString(36).slice(2);
        const user = await createTestUser(t, {
            userId: `objective-workflow-${suffix}`,
            email: `objective-workflow-${suffix}@example.com`,
            name: 'Objective Workflow User',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Objective Workflow Org ${suffix}`,
            slug: `objective-workflow-org-${suffix}`,
        });
        const now = Date.now();
        const objectiveId = await t.run(async ctx => {
            return await ctx.db.insert('objectives', {
                createdBy: user.docId,

                ownerId: user.docId,

                visibility: 'private',
                organizationId,
                title: 'Workflow race objective',
                targetValue: 100,
                currentValue: 10,
                startValue: 10,
                status: 'active',
                createdAt: now,
                updatedAt: now,
            });
        });

        const olderWorkflowId = asInvalidArg<WorkflowId>('00000000000000000010001workflows');
        const newerWorkflowId = asInvalidArg<WorkflowId>('00000000000000000010002workflows');

        await t.run(async ctx => {
            await ctx.db.patch('objectives', objectiveId, {
                workflowId: newerWorkflowId,
            });
        });

        await t.mutation(
            internal.jobs.objectives.lifecycleCompletion.handleObjectiveLifecycleComplete,
            {
                workflowId: olderWorkflowId,
                result: { kind: 'success', returnValue: null },
                context: {
                    objectiveId,
                    userId: user.docId,
                    organizationId,
                    resourceType: 'objective',
                },
            }
        );

        const objective = await t.run(async ctx => await ctx.db.get('objectives', objectiveId));
        expect(objective?.workflowId).toBe(newerWorkflowId);
    });

    test('clears objective workflow id when the matching workflow completes', async () => {
        const t = initConvexTest({ workflow: true });
        const suffix = Math.random().toString(36).slice(2);
        const user = await createTestUser(t, {
            userId: `objective-workflow-clear-${suffix}`,
            email: `objective-workflow-clear-${suffix}@example.com`,
            name: 'Objective Workflow Clear User',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Objective Workflow Clear Org ${suffix}`,
            slug: `objective-workflow-clear-org-${suffix}`,
        });
        const now = Date.now();
        const objectiveId = await t.run(async ctx => {
            return await ctx.db.insert('objectives', {
                createdBy: user.docId,

                ownerId: user.docId,

                visibility: 'private',
                organizationId,
                title: 'Workflow cleanup objective',
                targetValue: 100,
                currentValue: 10,
                startValue: 10,
                status: 'active',
                createdAt: now,
                updatedAt: now,
            });
        });

        const workflowId = asInvalidArg<WorkflowId>('00000000000000000010003workflows');

        await t.run(async ctx => {
            await ctx.db.patch('objectives', objectiveId, { workflowId });
        });

        await t.mutation(
            internal.jobs.objectives.lifecycleCompletion.handleObjectiveLifecycleComplete,
            {
                workflowId,
                result: { kind: 'success', returnValue: null },
                context: {
                    objectiveId,
                    userId: user.docId,
                    organizationId,
                    resourceType: 'objective',
                },
            }
        );

        const objective = await t.run(async ctx => await ctx.db.get('objectives', objectiveId));
        expect(objective?.workflowId).toBeUndefined();
    });
});
