import { describe, expect, test } from 'vitest';
import type { WorkflowId } from '@convex-dev/workflow';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';

describe('objective workflow lifecycle', () => {
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

        const olderWorkflowId = '00000000000000000010001workflows' as WorkflowId;
        const newerWorkflowId = '00000000000000000010002workflows' as WorkflowId;

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

        const objective = await t.run(async ctx => await ctx.db.get(objectiveId));
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

        const workflowId = '00000000000000000010003workflows' as WorkflowId;

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

        const objective = await t.run(async ctx => await ctx.db.get(objectiveId));
        expect(objective?.workflowId).toBeUndefined();
    });
});
