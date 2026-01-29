/**
 * Workflow UI Queries
 *
 * These queries expose workflow status and steps to the frontend for observability.
 * Use them to show users the progress of their objectives and achievements.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { vWorkflowId } from '@convex-dev/workflow';
import { workflow } from '../workflow';

/**
 * Query: Get status of a specific workflow
 * Returns: { type: 'inProgress' | 'completed' | 'canceled' | 'failed', ... }
 */
export const getWorkflowStatus = query({
  args: {
    workflowId: vWorkflowId,
  },
  handler: async (ctx, args) => {
    const status = await workflow.status(ctx, args.workflowId);
    return status;
  },
});

/**
 * Query: List steps for a workflow (paginated)
 * Useful for debugging and showing progress history
 */
export const getWorkflowSteps = query({
  args: {
    workflowId: vWorkflowId,
    pageSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const steps = await workflow.listSteps(ctx, args.workflowId, {
      order: 'desc',
      paginationOpts: {
        cursor: args.cursor ?? null,
        numItems: args.pageSize ?? 25,
      },
    });
    return steps;
  },
});

/**
 * Query: Get workflow status for an objective
 * This requires storing workflowId in the objective document
 *
 * TODO: Add workflowId field to objectives schema to enable this query
 */
export const getObjectiveWorkflowStatus = query({
  args: {
    objectiveId: v.id('objectives'),
  },
  handler: async (ctx, args) => {
    // First, we need to get the workflowId from somewhere
    // Options:
    // 1. Store workflowId in the objective document (add field to schema)
    // 2. Query a separate table mapping objectives to workflows
    // 3. Pass workflowId directly from frontend

    // For now, this is a placeholder - implement based on your choice
    const objective = await ctx.db.get('objectives', args.objectiveId);

    if (!objective || !('workflowId' in objective)) {
      return { status: 'not_found' };
    }

    // This would work if you add workflowId to the schema:
    // const status = await workflow.status(ctx, objective.workflowId);
    // return status;

    return { status: 'not_implemented' };
  },
});

/**
 * Query: Get all active workflows for current user
 * Useful for showing background activity
 *
 * TODO: Create a userWorkflows table to track this
 */
export const getUserActiveWorkflows = query({
  args: {},
  handler: async () => {
    // This requires a table mapping userId -> workflowIds
    // For now, return empty
    return [];
  },
});
