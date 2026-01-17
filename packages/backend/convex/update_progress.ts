import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { authComponent } from './auth';
import { internal } from './_generated/api';
import { createAuditLog, sanitizeForAudit, createChangeDiff } from './utils/auditLog';
import { paginationOptsValidator } from 'convex/server';

export const createUpdateProgress = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Try to get user from betterAuth, but fall back to identity for tests
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
        const userId = String(ctx.identity?.subject);
        if (!userId) throw new Error('User not authenticated');

        // Only check user._id if betterAuth is available (not in tests)
        if (user && !user._id) throw new Error('User not authenticated');

        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) {
            throw new Error('Objective not found');
        }

        const now = Date.now();
        const id = await ctx.db.insert('progressUpdates', {
            objective: args.objective,
            updatedValue: args.updatedValue,
            updateDate: args.updateDate,
            comment: args.comment,
            createdAt: now,
            updatedAt: now,
        });

        const unitSuffix = objective.unit ? ` ${objective.unit}` : '';
        await ctx.db.insert('notifications', {
            user: objective.user,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            notificationDate: now,
            message: `Progress updated for ${objective.title} (+${args.updatedValue}${unitSuffix}).`,
            createdAt: now,
            updatedAt: now,
        });

        // Check for achievements (streak, progress updates count)
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.user,
                trigger: 'progress_update',
            });
        }

        // Audit log
        await createAuditLog(ctx, {
            userId: objective.user,
            action: 'progress_update.created',
            resourceType: 'progress_update',
            resourceId: id,
            metadata: {
                after: {
                    objective: args.objective,
                    updatedValue: args.updatedValue,
                    updateDate: args.updateDate,
                    comment: args.comment,
                },
                context: `Progress update for objective: ${objective.title}`,
            },
        });

        return await ctx.db.get('progressUpdates', id);
    },
});

export const getUpdateProgressByObjectiveId = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
            .order('desc')
            .paginate(args.paginationOpts);

        return {
            page: results.page,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const updateUpdateProgress = mutationWithRLS({
    args: {
        id: v.id('progressUpdates'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        const existing = await ctx.db.get('progressUpdates', id);
        if (!existing) {
            throw new Error('Progress update not found');
        }

        const objective = await ctx.db.get('objectives', existing.objective);
        await ctx.db.patch('progressUpdates', id, { ...rest, updatedAt: Date.now() });

        // Audit log
        const changes = createChangeDiff(sanitizeForAudit(existing), rest);
        if (Object.keys(changes.after).length > 0) {
            await createAuditLog(ctx, {
                userId: objective?.user ?? String(ctx.identity?.subject),
                action: 'progress_update.updated',
                resourceType: 'progress_update',
                resourceId: id,
                metadata: {
                    before: changes.before,
                    after: changes.after,
                    context: objective
                        ? `Updated progress for objective: ${objective.title}`
                        : undefined,
                },
            });
        }

        return await ctx.db.get('progressUpdates', id);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: { _id: v.id('progressUpdates') },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('progressUpdates', args._id);
        const objective = existing ? await ctx.db.get('objectives', existing.objective) : null;

        await ctx.db.delete('progressUpdates', args._id);

        // Audit log
        if (existing) {
            await createAuditLog(ctx, {
                userId: objective?.user ?? String(ctx.identity?.subject),
                action: 'progress_update.deleted',
                resourceType: 'progress_update',
                resourceId: args._id,
                metadata: {
                    before: sanitizeForAudit(existing),
                    context: objective
                        ? `Deleted progress update for objective: ${objective.title}`
                        : undefined,
                },
                severity: 'critical',
            });
        }

        return 'Update progress deleted successfully' as const;
    },
});
