/**
 * Objective Internal Functions
 *
 * These internal functions are used by the objective lifecycle workflow.
 * They are not exposed to the public API and bypass RLS for workflow operations.
 */

import { v } from 'convex/values';
import { internalQuery, internalMutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { Doc } from './_generated/dataModel';
import { workflow } from './workflow';
import { tickEvent } from './objectiveEvents';
import { vWorkflowId } from '@convex-dev/workflow';

/**
 * Get objective by ID without RLS (for internal workflow use)
 */
export const getByIdInternal = internalQuery({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args): Promise<Doc<'objectives'> | null> => {
        return await ctx.db.get(args.objectiveId);
    },
});

/**
 * Set next tick timestamp and sequence number
 * Used by computeNextTickInternal to schedule the next tick
 */
export const setNextTickInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        nextTickAt: v.number(),
        nextTickSeq: v.number(),
    },
    handler: async (ctx, args): Promise<void> => {
        await ctx.db.patch(args.objectiveId, {
            nextTickAt: args.nextTickAt,
            nextTickSeq: args.nextTickSeq,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Clear next tick (when pausing or reaching terminal state)
 * This invalidates any pending scheduled ticks
 */
export const clearNextTickInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args): Promise<void> => {
        await ctx.db.patch(args.objectiveId, {
            nextTickAt: undefined,
            nextTickSeq: undefined,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Update objective status (internal, no RLS)
 * Optionally updates the workflowId
 */
export const updateStatusInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        newStatus: v.string(),
        workflowId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ success: boolean; previousStatus?: string }> => {
        const objective = await ctx.db.get(args.objectiveId);
        if (!objective) {
            return { success: false };
        }

        const updateData: Partial<Doc<'objectives'>> = {
            status: args.newStatus,
            updatedAt: Date.now(),
        };

        if (args.workflowId !== undefined) {
            updateData.workflowId = args.workflowId;
        }

        await ctx.db.patch(args.objectiveId, updateData);

        return { success: true, previousStatus: objective.status };
    },
});

/**
 * Process tick (idempotent)
 * Called when a tick event is received by the workflow
 * Checks for auto-completion and deadline status
 */
export const onTickInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        seq: v.number(),
    },
    handler: async (
        ctx,
        args
    ): Promise<{
        processed: boolean;
        reason?: string;
        autoCompleted?: boolean;
        isOverdue?: boolean;
    }> => {
        const objective = await ctx.db.get(args.objectiveId);
        if (!objective) {
            return { processed: false, reason: 'not_found' };
        }

        // Validate seq matches (anti-race pattern)
        if (objective.nextTickSeq !== args.seq) {
            return { processed: false, reason: 'seq_mismatch' };
        }

        // Skip if not active
        if (objective.status !== 'active') {
            return { processed: false, reason: 'not_active' };
        }

        const now = Date.now();
        let autoCompleted = false;
        let isOverdue = false;

        // Check auto-completion (direction-aware)
        const direction = objective.direction ?? 'increase';
        const shouldComplete =
            direction === 'decrease'
                ? objective.currentValue <= objective.targetValue
                : objective.currentValue >= objective.targetValue;

        if (shouldComplete) {
            await ctx.db.patch(args.objectiveId, {
                status: 'completed',
                updatedAt: now,
            });
            autoCompleted = true;

            // Create notification for auto-completion
            await ctx.db.insert('notifications', {
                userId: objective.userId,
                organizationId: objective.organizationId,
                objective: args.objectiveId,
                read: false,
                notificationType: 'status',
                notificationDate: now,
                message: `Your objective "${objective.title}" has been automatically completed!`,
                createdAt: now,
                updatedAt: now,
            });

            return { processed: true, autoCompleted: true };
        }

        // Check deadline (if set)
        if (objective.deadline && now > objective.deadline) {
            isOverdue = true;

            // Send deadline overdue notification (dedupe by checking recent notifications)
            const recentNotification = await ctx.db
                .query('notifications')
                .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
                .filter(q =>
                    q.and(
                        q.eq(q.field('notificationType'), 'deadline'),
                        q.gt(q.field('createdAt'), now - 24 * 60 * 60 * 1000)
                    )
                )
                .first();

            if (!recentNotification) {
                await ctx.db.insert('notifications', {
                    userId: objective.userId,
                    organizationId: objective.organizationId,
                    objective: args.objectiveId,
                    read: false,
                    notificationType: 'deadline',
                    notificationDate: now,
                    message: `Your objective "${objective.title}" has passed its deadline.`,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        return { processed: true, autoCompleted, isOverdue };
    },
});

/**
 * Send tick signal to workflow (validates seq before sending)
 * Called by scheduler.runAt - this is the anti-race validation point
 */
export const sendTickSignalInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        seq: v.number(),
        workflowId: vWorkflowId,
    },
    handler: async (ctx, args): Promise<{ sent: boolean; reason?: string }> => {
        const objective = await ctx.db.get(args.objectiveId);
        if (!objective) {
            return { sent: false, reason: 'not_found' };
        }

        // Anti-race validation: check if seq still matches
        if (objective.status !== 'active') {
            return { sent: false, reason: 'not_active' };
        }

        if (objective.nextTickSeq !== args.seq) {
            return { sent: false, reason: 'seq_mismatch_stale_tick' };
        }

        // Send the tick event to the workflow
        await workflow.sendEvent(ctx, {
            ...tickEvent,
            workflowId: args.workflowId,
            value: { seq: args.seq },
        });

        return { sent: true };
    },
});

/**
 * Compute and schedule next tick
 * Implements the anti-race pattern:
 * 1. Increment seq
 * 2. Save to DB
 * 3. Schedule sendTickSignalInternal with that seq
 */
export const computeNextTickInternal = internalAction({
    args: {
        objectiveId: v.id('objectives'),
        workflowId: vWorkflowId,
    },
    handler: async (
        ctx,
        args
    ): Promise<{ scheduled: boolean; nextTickAt?: number; seq?: number }> => {
        // Get current objective state
        const objective = await ctx.runQuery(internal.objectiveInternals.getByIdInternal, {
            objectiveId: args.objectiveId,
        });

        if (!objective) {
            return { scheduled: false };
        }

        if (objective.status !== 'active') {
            return { scheduled: false };
        }

        // Calculate next tick time (daily check)
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const nextTickAt = Date.now() + ONE_DAY_MS;

        // Increment seq (anti-race pattern)
        const currentSeq = objective.nextTickSeq ?? 0;
        const newSeq = currentSeq + 1;

        // Save new tick info to DB
        await ctx.runMutation(internal.objectiveInternals.setNextTickInternal, {
            objectiveId: args.objectiveId,
            nextTickAt,
            nextTickSeq: newSeq,
        });

        // Schedule the tick signal
        await ctx.scheduler.runAt(nextTickAt, internal.objectiveInternals.sendTickSignalInternal, {
            objectiveId: args.objectiveId,
            seq: newSeq,
            workflowId: args.workflowId,
        });

        return { scheduled: true, nextTickAt, seq: newSeq };
    },
});

/**
 * Set workflow ID on objective
 */
export const setWorkflowIdInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        workflowId: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        await ctx.db.patch(args.objectiveId, {
            workflowId: args.workflowId,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Clear workflow ID on objective (when workflow ends)
 */
export const clearWorkflowIdInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args): Promise<void> => {
        const objective = await ctx.db.get(args.objectiveId);
        if (objective) {
            await ctx.db.patch(args.objectiveId, {
                workflowId: undefined,
                nextTickAt: undefined,
                nextTickSeq: undefined,
                updatedAt: Date.now(),
            });
        }
    },
});

/**
 * Hard delete objective from database
 * For permanent removal (not soft delete)
 */
export const hardDeleteInternal = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args): Promise<{ deleted: boolean }> => {
        const objective = await ctx.db.get(args.objectiveId);
        if (!objective) {
            return { deleted: false };
        }

        // Delete associated progress updates
        const progressUpdates = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .collect();

        for (const update of progressUpdates) {
            await ctx.db.delete(update._id);
        }

        // Delete associated notifications
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
            .collect();

        for (const notification of notifications) {
            await ctx.db.delete(notification._id);
        }

        // Delete the objective
        await ctx.db.delete(args.objectiveId);

        return { deleted: true };
    },
});
