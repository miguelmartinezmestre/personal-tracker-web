/**
 * Objectives Queries and General Updates
 *
 * This file contains query functions for objectives.
 * Status-changing mutations are in objectivePublic.ts
 */

import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { paginationOptsValidator } from 'convex/server';
import { computeCurrentValue, computeLastProgressAt } from './utils/objectiveProgress';
import { computeNextReminderAt } from './utils/reminderSchedule';
import {
    objectiveStatusValidator,
    objectiveTypeValidator,
    periodValidator,
    directionValidator,
    reminderIntervalValidator,
    progressModeValidator,
} from './utils/validators';

export {
    createObjective,
    pauseObjective,
    resumeObjective,
    completeObjective,
    archiveObjective,
    deleteObjective,
    hardDeleteObjective,
    reconfigureObjective,
} from './objectivePublic';

/**
 * Get objectives for the current user with pagination
 */
export const getObjectivesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = String(ctx.userId);
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.neq(q.field('status'), 'deleted'))
            .order('desc')
            .paginate(paginationOpts);

        return results;
    },
});

/**
 * Get a single objective by ID
 */
export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const result = await ctx.db.get('objectives', args.id);
        return result;
    },
});

/**
 * Get objectives by status
 */
export const getObjectivesByStatus = queryWithRLS({
    args: {
        status: objectiveStatusValidator,
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { status, paginationOpts }) => {
        const userId = String(ctx.userId);
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.eq(q.field('status'), status))
            .order('desc')
            .paginate(paginationOpts);

        return results;
    },
});

/**
 * Get deleted objectives for the trash view
 */
export const getDeletedObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = String(ctx.userId);
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.eq(q.field('status'), 'deleted'))
            .order('desc')
            .paginate(paginationOpts);

        return results;
    },
});

/**
 * Update objective fields (non-status updates)
 * For status changes, use the mutations in objectivePublic.ts
 */
export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
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
        const { id, ...rest } = args;
        const existing = await ctx.db.get('objectives', id);
        if (!existing) {
            throw new Error('Objective not found');
        }

        // Block editing of completed, archived, or deleted objectives
        if (
            existing.status === 'completed' ||
            existing.status === 'archived' ||
            existing.status === 'deleted'
        ) {
            throw new Error(`Cannot edit an objective with status: ${existing.status}`);
        }

        const now = Date.now();
        const updateData: Record<string, unknown> = { ...rest };

        // Only recalculate nextReminderAt when the interval actually changes (M17)
        if (
            args.reminderInterval !== undefined &&
            args.reminderInterval !== existing.reminderInterval
        ) {
            updateData.nextReminderAt = computeNextReminderAt(args.reminderInterval, now);
        }

        const shouldRecalculate = args.progressMode !== undefined || args.startValue !== undefined;

        // Period fields are passed through from args via the spread above.
        // If period is set to 'none', clear the period-specific fields.
        if (args.period === 'none') {
            updateData.periodStart = undefined;
            updateData.periodLengthDays = undefined;
        }

        if (shouldRecalculate) {
            const updates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective_date', q => q.eq('objective', id))
                .collect();
            const objectiveForCalc = {
                ...existing,
                ...updateData,
            } as typeof existing;
            updateData.currentValue = computeCurrentValue(objectiveForCalc, updates);
            updateData.lastProgressAt = computeLastProgressAt(updates);
        }

        const updated = await ctx.db.patch('objectives', id, { ...updateData, updatedAt: now });

        // Auto-complete if targetValue or direction changed such that the objective is now met
        if (args.targetValue !== undefined || args.direction !== undefined) {
            const patched = await ctx.db.get('objectives', id);
            if (patched && patched.status === 'active') {
                const direction = patched.direction ?? 'increase';
                const isComplete =
                    direction === 'decrease'
                        ? patched.currentValue <= patched.targetValue
                        : patched.currentValue >= patched.targetValue;
                if (isComplete) {
                    await ctx.db.patch('objectives', id, {
                        status: 'completed',
                        nextReminderAt: undefined,
                        updatedAt: Date.now(),
                    });
                }
            }
        }

        return updated;
    },
});

/**
 * Get objectives shared with the user (collaborative objectives)
 */
export const getSharedObjectives = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = String(ctx.userId);

        // Get all organization objectives where user is a collaborator
        // First, get the user's organization from betterAuth
        const membersResult = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .collect();

        if (!membersResult || membersResult.length === 0) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const orgMember = membersResult[0];
        const organizationId = orgMember?.organizationId ?? '';

        // Use Convex built-in pagination on the indexed query
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .order('desc')
            .paginate(paginationOpts);

        // Filter out the user's own objectives and deleted/archived objectives
        const filteredPage = results.page.filter(
            o => o.userId !== userId && o.status !== 'deleted' && o.status !== 'archived'
        );

        return {
            ...results,
            page: filteredPage,
        };
    },
});

/**
 * Add a collaborator to an objective
 */
export const addCollaborator = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        collaboratorId: v.string(),
    },
    handler: async (ctx, { objectiveId, collaboratorId }) => {
        const objective = await ctx.db.get('objectives', objectiveId);
        if (!objective) {
            throw new Error('Objective not found');
        }

        // Check if the user is the owner
        const userId = String(ctx.userId);
        if (objective.userId !== userId) {
            throw new Error('Only the owner can add collaborators');
        }

        // Check if the collaborator is a member of any organization
        const collaboratorsResult = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', collaboratorId))
            .collect();

        if (collaboratorsResult.length === 0) {
            throw new Error('Collaborator not found');
        }

        // Verify the collaborator belongs to the same organization as the objective
        const sameOrgMember = collaboratorsResult.find(
            m => m.organizationId === objective.organizationId
        );
        if (!sameOrgMember) {
            throw new Error('Collaborator must be a member of the same organization');
        }

        // Don't add if already a collaborator or is the owner
        if (objective.userId === collaboratorId) {
            return objective;
        }

        // Get existing collaborators or initialize empty array
        const existingCollaborators = objective.collaborators ?? [];

        // Don't add if already a collaborator
        if (existingCollaborators.includes(collaboratorId)) {
            return objective;
        }

        const now = Date.now();
        const updated = await ctx.db.patch('objectives', objectiveId, {
            collaborators: [...existingCollaborators, collaboratorId],
            updatedAt: now,
        });
        return updated;
    },
});

/**
 * Remove a collaborator from an objective
 */
export const removeCollaborator = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        collaboratorId: v.string(),
    },
    handler: async (ctx, { objectiveId, collaboratorId }) => {
        const objective = await ctx.db.get('objectives', objectiveId);
        if (!objective) {
            throw new Error('Objective not found');
        }

        // Check if the user is the owner
        const userId = String(ctx.userId);
        if (objective.userId !== userId) {
            throw new Error('Only the owner can remove collaborators');
        }

        if (!objective.collaborators) {
            return objective;
        }

        const now = Date.now();
        const collaborators = objective.collaborators.filter(id => id !== collaboratorId);
        const updated = await ctx.db.patch('objectives', objectiveId, {
            collaborators,
            updatedAt: now,
        });

        return updated;
    },
});

/**
 * Get organization members for adding as collaborators
 */
export const getOrganizationMembers = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.userId);

        // Get the user's organization from betterAuth
        const userMembersResult = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .collect();

        const userMember = userMembersResult[0];
        if (!userMember) {
            return [];
        }

        // Get all members of the organization
        const membersResult = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', userMember.organizationId))
            .collect();

        const members = membersResult ?? [];

        // Get user details for each member using betterAuth adapter
        const membersWithDetails = await Promise.all(
            members.map(
                async (member: { userId: string; role: string; organizationId: string }) => {
                    const usersResult = await ctx.db
                        .query('user')
                        .withIndex('userId', q => q.eq('userId', member.userId))
                        .collect();
                    const user = usersResult[0];
                    return {
                        userId: member.userId,
                        name: user?.name,
                        email: user?.email,
                        role: member.role,
                    };
                }
            )
        );

        return membersWithDetails;
    },
});
