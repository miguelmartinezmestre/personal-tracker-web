/**
 * Workflow Kickoff Mutations
 *
 * These mutations are called from the frontend or other functions to start workflows.
 * They handle the transition from "normal" operations to workflow-driven processing.
 */

import { v } from 'convex/values';
import { mutation, internalMutation } from '../_generated/server';
import { workflow } from '../workflow';
import { internal } from '../_generated/api';
import { vWorkflowId } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';
import { getHeaders, getSession } from '../betterAuth/helpers';

/**
 * Public Mutation: Start objective lifecycle workflow
 * Call this when creating a new objective
 */
export const startObjectiveLifecycle = mutation({
  args: {
    objectiveId: v.id('objectives'),
    enableReminders: v.optional(v.boolean()),
    reminderIntervalDays: v.optional(v.number()),
    stallThresholdDays: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('User not authenticated');
    }
    const userId = String(identity.subject);

    const workflowId = await workflow.start(
      ctx,
      internal.workflows.objectiveLifecycle.objectiveLifecycle,
      {
        objectiveId: args.objectiveId,
        userId,
        enableReminders: args.enableReminders,
        reminderIntervalDays: args.reminderIntervalDays,
        stallThresholdDays: args.stallThresholdDays,
      },
      {
        // Optional: Run cleanup when workflow completes
        onComplete: internal.workflows.kickoff.handleObjectiveLifecycleComplete,
        context: { objectiveId: args.objectiveId, userId },
      }
    );

    return { workflowId };
  },
});

/**
 * Public Mutation: Trigger achievement check after progress update
 * Replaces the direct scheduler.runAfter call in createUpdateProgress
 */
export const triggerAchievementCheck = mutation({
  args: {
    trigger: v.string(), // 'objective_created' | 'objective_completed' | 'progress_update'
  },
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('User not authenticated');
    }
    const userId = String(identity.subject);

    // Get organizationId from session
    let organizationId: string | undefined = undefined;
    try {
      const session = await getSession(ctx);
      const auth = await getAuth(ctx);
      const headers = await getHeaders(ctx, session);

      // const session = await auth.api.getActiveOrganization({ headers });
      organizationId = session?.activeOrganizationId ?? undefined;
    } catch {
      organizationId = undefined;
    }

    // Choose the appropriate workflow based on trigger
    const workflowFn =
      args.trigger === 'progress_update'
        ? internal.workflows.achievementProcessing.processProgressAchievements
        : args.trigger === 'objective_completed'
          ? internal.workflows.achievementProcessing.processCompletionAchievements
          : internal.workflows.achievementProcessing.processAchievements;

    const workflowId = await workflow.start(
      ctx,
      workflowFn,
      {
        userId,
        organizationId,
      },
      {
        onComplete: internal.workflows.kickoff.handleAchievementCheckComplete,
        context: { userId, trigger: args.trigger },
      }
    );

    return { workflowId };
  },
});

/**
 * Internal Mutation: Handle objective lifecycle completion
 * Called automatically when the lifecycle workflow ends
 */
export const handleObjectiveLifecycleComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    const { result, context } = args;

    // Log completion for observability
    if (result.kind === 'success') {
      // Objective was completed
      // Could trigger additional workflows here
    } else if (result.kind === 'failed') {
      // Log error for debugging
      console.error('Objective lifecycle workflow error:', result.error);
    } else if (result.kind === 'canceled') {
      // Workflow was canceled - objective might have been deleted
    }

    // Cleanup workflow storage
    await workflow.cleanup(ctx, args.workflowId);

    return { handled: true };
  },
});

/**
 * Internal Mutation: Handle objective lifecycle V2 completion
 * Called automatically when the new durable lifecycle workflow ends
 */
export const handleObjectiveLifecycleV2Complete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    const { result, context } = args;
    const objectiveId = context?.objectiveId;

    // Clear workflow reference from objective
    if (objectiveId) {
      const objective = await ctx.db.get(objectiveId);
      if (objective) {
        await ctx.db.patch(objectiveId, {
          workflowId: undefined,
          nextTickAt: undefined,
          nextTickSeq: undefined,
        });
      }
    }

    // Log completion for observability
    if (result.kind === 'success') {
      const returnValue = result.returnValue as { finalStatus: string; reason: string };
      console.log(`Objective lifecycle V2 completed: ${returnValue.finalStatus} - ${returnValue.reason}`);
    } else if (result.kind === 'failed') {
      console.error('Objective lifecycle V2 workflow error:', result.error);
    } else if (result.kind === 'canceled') {
      console.log('Objective lifecycle V2 workflow was canceled');
    }

    // Cleanup workflow storage
    await workflow.cleanup(ctx, args.workflowId);

    return { handled: true };
  },
});

/**
 * Internal Mutation: Handle achievement check completion
 * Called automatically when achievement processing ends
 */
export const handleAchievementCheckComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(),
  },
  handler: async (ctx, args) => {
    const { result, context } = args;

    if (result.kind === 'success') {
      const awarded = result.returnValue as { awarded: string[] };
      // Could trigger notification summary here
    } else if (result.kind === 'failed') {
      console.error('Achievement check workflow error:', result.error);
    }

    // Cleanup workflow storage
    await workflow.cleanup(ctx, args.workflowId);

    return { handled: true };
  },
});

/**
 * Public Mutation: Cancel objective lifecycle workflow
 * Call this when deleting or manually completing an objective
 */
export const cancelObjectiveWorkflow = mutation({
  args: {
    workflowId: vWorkflowId,
  },
  handler: async (ctx, args) => {
    await workflow.cancel(ctx, args.workflowId);
    return { canceled: true };
  },
});

/**
 * Query: Get workflow status (for UI)
 */
import { query } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { getAuth } from '../functions/auth';

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
 * Query: List workflow steps (for observability/debugging)
 */
export const getWorkflowSteps = query({
  args: {
    workflowId: vWorkflowId,
  },
  handler: async (ctx, args) => {
    const steps = await workflow.listSteps(ctx, args.workflowId, {
      order: 'desc',
      paginationOpts: {
        cursor: null,
        numItems: 50,
      },
    });
    return steps;
  },
});
