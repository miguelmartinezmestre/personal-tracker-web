/**
 * Objective Public Mutations
 *
 * Public mutations for managing objectives with the durable workflow system.
 * These mutations handle user interactions and send signals to the workflow.
 */

import { v } from 'convex/values';
import { mutationWithRLS } from './rls';
import { internal } from './_generated/api';
import { workflow } from './workflow';
import { type WorkflowId } from '@convex-dev/workflow';
import { isValidTransition } from './objectiveEvents';
import { computeNextReminderAt } from './utils/reminderSchedule';
import {
    objectiveTypeValidator,
    directionValidator,
    reminderIntervalValidator,
    progressModeValidator,
    periodValidator,
} from './utils/validators';
import { OBJECTIVE_TYPE, DIRECTION, REMINDER_INTERVAL, PROGRESS_MODE } from './utils/constants';

/**
 * Create a new objective
 * Automatically starts in 'active' state and launches the workflow
 */
export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        unit: v.optional(v.string()),
        objectiveType: objectiveTypeValidator,
        direction: directionValidator,
        period: periodValidator,
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
        reminderInterval: reminderIntervalValidator,
        progressMode: progressModeValidator,
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const userId = String(ctx.identity?.subject);
        const objectiveType = args.objectiveType ?? OBJECTIVE_TYPE.VALUE;
        const direction = args.direction ?? DIRECTION.INCREASE;
        const reminderInterval = args.reminderInterval ?? REMINDER_INTERVAL.NONE;
        const progressMode = args.progressMode ?? PROGRESS_MODE.CUMULATIVE;

        // Create objective in 'active' state (auto-activate)
        const objectiveId = await ctx.db.insert('objectives', {
            userId,
            organizationId: ctx.organizationId,
            title: args.title,
            description: args.description,
            category: args.category,
            targetValue: args.targetValue,
            currentValue: args.currentValue,
            startValue: args.startValue ?? args.currentValue,
            deadline: args.deadline,
            status: 'active', // Auto-activate
            unit: args.unit,
            objectiveType,
            direction,
            period: 'none',
            periodStart: undefined,
            periodLengthDays: undefined,
            reminderInterval,
            nextReminderAt: computeNextReminderAt(reminderInterval, now),
            progressMode,
            lastProgressAt: now,
            createdAt: now,
            updatedAt: now,
            // Workflow fields will be set by the workflow
        });

        // Check for achievements after objective creation
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId,
                trigger: 'objective_created',
            });
        }

        // Start the workflow (non-blocking in tests)
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            const workflowId = await workflow.start(
                ctx,
                internal.workflows.objectiveLifecycle.objectiveLifecycle,
                {
                    objectiveId,
                    userId,
                    enableReminders: true,
                    stallThresholdDays: 14,
                },
                {
                    onComplete: internal.workflows.kickoff.handleObjectiveLifecycleComplete,
                    context: { objectiveId, userId },
                }
            );

            // Store workflowId in objective
            await ctx.db.patch(objectiveId, { workflowId: String(workflowId) });
        }

        return objectiveId;
    },
});

/**
 * Pause an objective
 * Sends pause signal to the workflow
 */
export const pauseObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        if (!isValidTransition(objective.status, 'paused')) {
            throw new Error(`Cannot pause objective from status: ${objective.status}`);
        }

        // Update status directly
        await ctx.db.patch(args.id, {
            status: 'paused',
            nextReminderAt: undefined,
            updatedAt: Date.now(),
        });

        // Cancel workflow if running
        if (objective.workflowId) {
            try {
                await workflow.cancel(ctx, objective.workflowId as WorkflowId);
            } catch (e) {
                // Ignore errors if workflow already completed/canceled
            }
            await ctx.db.patch(args.id, { workflowId: undefined });
        }

        return { success: true };
    },
});

/**
 * Resume a paused objective
 * Sends resume signal to the workflow
 */
export const resumeObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        if (objective.status !== 'paused') {
            throw new Error(`Cannot resume objective from status: ${objective.status}`);
        }

        // Update status directly
        const now = Date.now();
        await ctx.db.patch(args.id, {
            status: 'active',
            updatedAt: now,
        });

        await ctx.db.patch(args.id, {
            nextReminderAt: computeNextReminderAt(objective.reminderInterval ?? 'none', now),
            updatedAt: now,
        });

        // Start workflow again if not in tests
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            const workflowId = await workflow.start(
                ctx,
                internal.workflows.objectiveLifecycle.objectiveLifecycle,
                {
                    objectiveId: args.id,
                    userId: objective.userId,
                    enableReminders: true,
                    stallThresholdDays: 14,
                },
                {
                    onComplete: internal.workflows.kickoff.handleObjectiveLifecycleComplete,
                    context: { objectiveId: args.id, userId: objective.userId },
                }
            );

            await ctx.db.patch(args.id, { workflowId: String(workflowId) });
        }

        return { success: true };
    },
});

/**
 * Complete an objective manually
 * Sends complete signal to the workflow
 */
export const completeObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        if (!isValidTransition(objective.status, 'completed')) {
            throw new Error(`Cannot complete objective from status: ${objective.status}`);
        }

        const now = Date.now();

        // Update status directly
        await ctx.db.patch(args.id, {
            status: 'completed',
            nextReminderAt: undefined,
            updatedAt: now,
        });

        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId,
            objective: args.id,
            read: false,
            notificationType: 'status',
            notificationDate: now,
            message: `Your objective "${objective.title}" has been completed!`,
            createdAt: now,
            updatedAt: now,
        });

        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.userId,
                trigger: 'objective_completed',
            });
        }

        // Cancel workflow if running
        if (objective.workflowId) {
            try {
                await workflow.cancel(ctx, objective.workflowId as WorkflowId);
            } catch (e) {
                // Ignore errors if workflow already completed/canceled
            }
            await ctx.db.patch(args.id, { workflowId: undefined });
        }

        return { success: true };
    },
});

/**
 * Archive an objective
 * Sends archive signal to the workflow (terminal state, read-only)
 */
export const archiveObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        if (!isValidTransition(objective.status, 'archived')) {
            throw new Error(`Cannot archive objective from status: ${objective.status}`);
        }

        // Update status directly
        await ctx.db.patch(args.id, {
            status: 'archived',
            nextReminderAt: undefined,
            updatedAt: Date.now(),
        });

        // Cancel workflow if running
        if (objective.workflowId) {
            try {
                await workflow.cancel(ctx, objective.workflowId as WorkflowId);
            } catch (e) {
                // Ignore errors if workflow already completed/canceled
            }
            await ctx.db.patch(args.id, { workflowId: undefined });
        }

        return { success: true };
    },
});

/**
 * Soft delete an objective
 * Sends delete signal to the workflow (terminal state)
 */
export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        if (!isValidTransition(objective.status, 'deleted')) {
            throw new Error(`Cannot delete objective from status: ${objective.status}`);
        }

        const now = Date.now();

        // Update status directly
        await ctx.db.patch(args.id, {
            status: 'deleted',
            nextReminderAt: undefined,
            updatedAt: now,
        });

        // Cancel workflow if running
        if (objective.workflowId) {
            try {
                await workflow.cancel(ctx, objective.workflowId as WorkflowId);
            } catch (e) {
                // Ignore errors if workflow already completed/canceled
            }
            await ctx.db.patch(args.id, { workflowId: undefined });
        }

        return { success: true };
    },
});

/**
 * Hard delete an objective (permanent removal)
 * This bypasses the workflow and deletes directly from DB
 */
export const hardDeleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        // Cancel workflow if running
        if (objective.workflowId) {
            try {
                await workflow.cancel(ctx, objective.workflowId as WorkflowId);
            } catch (e) {
                // Ignore errors if workflow already completed/canceled
            }
        }

        // Delete associated progress updates
        const progressUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', args.id))
            .collect();

        for (const update of progressUpdates) {
            await ctx.db.delete(update._id);
        }

        // Delete associated notifications
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_objective', q => q.eq('objective', args.id))
            .collect();

        for (const notification of notifications) {
            await ctx.db.delete(notification._id);
        }

        // Delete the objective
        await ctx.db.delete(args.id);

        return { success: true };
    },
});

/**
 * Reconfigure an objective (change deadline, period, target value)
 * Sends reconfigure signal to the workflow
 */
export const reconfigureObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        newDeadline: v.optional(v.number()),
        newPeriod: v.optional(v.string()),
        newTargetValue: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        // Only allow reconfiguration on active or paused objectives
        if (!['active', 'paused'].includes(objective.status)) {
            throw new Error(`Cannot reconfigure objective with status: ${objective.status}`);
        }

        // Update the objective fields
        const updateData: Record<string, unknown> = {
            updatedAt: Date.now(),
        };

        if (args.newDeadline !== undefined) {
            updateData.deadline = args.newDeadline;
        }
        if (args.newPeriod !== undefined) {
            updateData.period = args.newPeriod;
        }
        if (args.newTargetValue !== undefined) {
            updateData.targetValue = args.newTargetValue;
        }

        await ctx.db.patch(args.id, updateData);

        return { success: true };
    },
});
