import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { Doc } from './_generated/dataModel';
import { internal } from './_generated/api';
import { MutationCtx } from './_generated/server';
import { createAuditLog, sanitizeForAudit, createChangeDiff } from './utils/auditLog';
import { paginationOptsValidator } from 'convex/server';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_DAYS = 3;

type ObjectiveWithPeriod = Doc<'objectives'> & {
    objectiveType?: string;
    period?: string;
    periodStart?: number;
    periodLengthDays?: number;
};

const getPeriodRange = (
    period: string | undefined,
    now: number,
    periodStart?: number,
    periodLengthDays?: number
) => {
    if (!period || period === 'none') return null;

    const date = new Date(now);

    switch (period) {
        case 'weekly': {
            const day = date.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() + diffToMonday);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'monthly': {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'custom': {
            if (!periodStart || !periodLengthDays || periodLengthDays <= 0) return null;
            const lengthMs = periodLengthDays * DAY_MS;
            if (now < periodStart) {
                return { start: periodStart, end: periodStart + lengthMs };
            }
            const cycles = Math.floor((now - periodStart) / lengthMs);
            const start = periodStart + cycles * lengthMs;
            return { start, end: start + lengthMs };
        }
        default:
            return null;
    }
};

const isEventBasedObjective = (objectiveType?: string, period?: string) => {
    if (objectiveType && objectiveType !== 'value') return true;
    return !!(period && period !== 'none');
};

const sumUpdates = (updates: { updatedValue: number }[]) =>
    updates.reduce((total, update) => total + update.updatedValue, 0);

const formatStatusLabel = (status: string): string =>
    status === 'in_progress' ? 'in progress' : status;

interface StatusNotificationParams {
    objectiveId: Doc<'objectives'>['_id'];
    userId: string;
    title: string;
    status: string;
    now: number;
}

const insertStatusNotification = async (
    ctx: MutationCtx,
    { objectiveId, userId, title, status, now }: StatusNotificationParams
): Promise<void> => {
    await ctx.db.insert('notifications', {
        user: userId,
        objective: objectiveId,
        read: false,
        notificationType: 'status',
        notificationDate: now,
        message: `Objective "${title}" marked as ${formatStatusLabel(status)}.`,
        createdAt: now,
        updatedAt: now,
    });
};

const maybeNotifyDeadline = async (
    ctx: MutationCtx,
    {
        objectiveId,
        userId,
        title,
        deadline,
        now,
    }: {
        objectiveId: Doc<'objectives'>['_id'];
        userId: string;
        title: string;
        deadline: number;
        now: number;
    }
) => {
    const daysUntil = Math.ceil((deadline - now) / DAY_MS);
    const formattedDate = new Date(deadline).toLocaleDateString();

    if (deadline <= now) {
        await ctx.db.insert('notifications', {
            user: userId,
            objective: objectiveId,
            read: false,
            notificationType: 'deadline',
            notificationDate: now,
            message: `Objective "${title}" is overdue since ${formattedDate}.`,
            createdAt: now,
            updatedAt: now,
        });
        return;
    }

    if (daysUntil <= DEADLINE_SOON_DAYS) {
        await ctx.db.insert('notifications', {
            user: userId,
            objective: objectiveId,
            read: false,
            notificationType: 'deadline',
            notificationDate: now,
            message: `Objective "${title}" is due in ${daysUntil} day${
                daysUntil === 1 ? '' : 's'
            } (${formattedDate}).`,
            createdAt: now,
            updatedAt: now,
        });
    }
};

export const getObjectivesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const results = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', String(ctx.identity?.subject)))
            .order('desc')
            .paginate(paginationOpts);

        const now = Date.now();

        const pageWithCurrentValue = await Promise.all(
            results.page.map(async objective => {
                const objectiveType = objective.objectiveType ?? 'value';
                const period = objective.period ?? 'none';

                if (!isEventBasedObjective(objectiveType, period)) {
                    return objective;
                }

                const range = getPeriodRange(
                    period,
                    now,
                    objective.periodStart,
                    objective.periodLengthDays
                );

                const updates = range
                    ? await ctx.db
                          .query('progressUpdates')
                          .withIndex('by_objective_date', q =>
                              q
                                  .eq('objective', objective._id)
                                  .gte('updateDate', range.start)
                                  .lt('updateDate', range.end)
                          )
                          .collect()
                    : await ctx.db
                          .query('progressUpdates')
                          .withIndex('by_objective', q => q.eq('objective', objective._id))
                          .collect();

                return {
                    ...objective,
                    currentValue: sumUpdates(updates),
                };
            })
        );

        return {
            page: pageWithCurrentValue,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = (await ctx.db.get(args.id)) as ObjectiveWithPeriod | null;
        if (!objective) return null;

        const objectiveType = objective.objectiveType ?? 'value';
        const period = objective.period ?? 'none';
        if (!isEventBasedObjective(objectiveType, period)) {
            return objective;
        }

        const now = Date.now();
        const range = getPeriodRange(
            period,
            now,
            objective.periodStart,
            objective.periodLengthDays
        );

        const updates = range
            ? await ctx.db
                  .query('progressUpdates')
                  .withIndex('by_objective_date', q =>
                      q
                          .eq('objective', objective._id)
                          .gte('updateDate', range.start)
                          .lt('updateDate', range.end)
                  )
                  .collect()
            : await ctx.db
                  .query('progressUpdates')
                  .withIndex('by_objective', q => q.eq('objective', objective._id))
                  .collect();

        return {
            ...objective,
            currentValue: sumUpdates(updates),
        };
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(),
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const objectiveType = args.objectiveType ?? 'value';
        const period = args.period ?? 'none';

        const objectiveId = await ctx.db.insert('objectives', {
            user: String(ctx.identity?.subject),
            title: args.title,
            description: args.description,
            category: args.category,
            targetValue: args.targetValue,
            currentValue: args.currentValue,
            deadline: args.deadline,
            status: args.status,
            unit: args.unit,
            objectiveType,
            period,
            periodStart: args.periodStart,
            periodLengthDays: args.periodLengthDays,
            createdAt: now,
            updatedAt: now,
        });

        if (args.deadline) {
            await maybeNotifyDeadline(ctx, {
                objectiveId,
                userId: String(ctx.identity?.subject),
                title: args.title,
                deadline: args.deadline,
                now,
            });
        }

        // Check for achievements
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: String(ctx.identity?.subject),
                trigger: 'objective_created',
            });
        }

        // Audit log
        await createAuditLog(ctx, {
            userId: String(ctx.identity?.subject),
            action: 'objective.created',
            resourceType: 'objective',
            resourceId: objectiveId,
            metadata: {
                after: {
                    title: args.title,
                    targetValue: args.targetValue,
                    status: args.status,
                    category: args.category,
                    deadline: args.deadline,
                },
            },
        });

        return objectiveId;
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
        currentValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: v.optional(v.string()),
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        const existing = await ctx.db.get(id);
        if (!existing) {
            throw new Error('Objective not found');
        }

        const now = Date.now();
        const updated = await ctx.db.patch(id, { ...rest, updatedAt: now });

        if (args.deadline !== undefined && args.deadline !== existing.deadline) {
            const updatedTitle = args.title ?? existing.title;
            await maybeNotifyDeadline(ctx, {
                objectiveId: id,
                userId: existing.user,
                title: updatedTitle,
                deadline: args.deadline,
                now,
            });
        }

        // Audit log
        const changes = createChangeDiff(sanitizeForAudit(existing), rest);
        if (Object.keys(changes.after).length > 0) {
            await createAuditLog(ctx, {
                userId: existing.user,
                action: 'objective.updated',
                resourceType: 'objective',
                resourceId: id,
                metadata: {
                    before: changes.before,
                    after: changes.after,
                    context: `Updated objective: ${existing.title}`,
                },
            });
        }

        return updated;
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);

        const result = await ctx.db.delete(args.id);

        // Audit log
        if (existing) {
            await createAuditLog(ctx, {
                userId: existing.user,
                action: 'objective.deleted',
                resourceType: 'objective',
                resourceId: args.id,
                metadata: {
                    before: sanitizeForAudit(existing),
                    context: `Deleted objective: ${existing.title}`,
                },
                severity: 'critical',
            });
        }

        return result;
    },
});

export const updateObjectiveStatus = mutationWithRLS({
    args: {
        id: v.id('objectives'),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const { id, status } = args;
        const objective = await ctx.db.get(id);
        if (!objective) {
            throw new Error('Objective not found');
        }
        if (objective.status === status) {
            return objective;
        }

        const previousStatus = objective.status;
        const now = Date.now();
        const updated = await ctx.db.patch(id, {
            status,
            updatedAt: now,
        });

        await insertStatusNotification(ctx, {
            objectiveId: id,
            userId: objective.user,
            title: objective.title,
            status,
            now,
        });

        // Audit log
        await createAuditLog(ctx, {
            userId: objective.user,
            action: 'objective.status_changed',
            resourceType: 'objective',
            resourceId: id,
            metadata: {
                before: { status: previousStatus },
                after: { status },
                context: `Status changed for objective: ${objective.title}`,
            },
            severity: 'warning',
        });

        return updated;
    },
});

export const completeObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        const previousStatus = objective.status;
        const previousValue = objective.currentValue;
        const now = Date.now();
        const updated = await ctx.db.patch(args.id, {
            status: 'completed',
            currentValue: objective.targetValue,
            updatedAt: now,
        });

        await insertStatusNotification(ctx, {
            objectiveId: args.id,
            userId: objective.user,
            title: objective.title,
            status: 'completed',
            now,
        });

        // Check for achievements
        if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId: objective.user,
                trigger: 'objective_completed',
            });
        }

        // Audit log
        await createAuditLog(ctx, {
            userId: objective.user,
            action: 'objective.completed',
            resourceType: 'objective',
            resourceId: args.id,
            metadata: {
                before: { status: previousStatus, currentValue: previousValue },
                after: { status: 'completed', currentValue: objective.targetValue },
                context: `Completed objective: ${objective.title}`,
            },
            severity: 'warning',
        });

        return updated;
    },
});

export const archiveObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        const previousStatus = objective.status;
        const now = Date.now();
        const updated = await ctx.db.patch(args.id, {
            status: 'archived',
            updatedAt: now,
        });

        await insertStatusNotification(ctx, {
            objectiveId: args.id,
            userId: objective.user,
            title: objective.title,
            status: 'archived',
            now,
        });

        // Audit log
        await createAuditLog(ctx, {
            userId: objective.user,
            action: 'objective.archived',
            resourceType: 'objective',
            resourceId: args.id,
            metadata: {
                before: { status: previousStatus },
                after: { status: 'archived' },
                context: `Archived objective: ${objective.title}`,
            },
            severity: 'warning',
        });

        return updated;
    },
});

export const pauseObjective = mutationWithRLS({
    args: {
        id: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get(args.id);
        if (!objective) {
            throw new Error('Objective not found');
        }

        const previousStatus = objective.status;
        const now = Date.now();
        const updated = await ctx.db.patch(args.id, {
            status: 'paused',
            updatedAt: now,
        });

        await insertStatusNotification(ctx, {
            objectiveId: args.id,
            userId: objective.user,
            title: objective.title,
            status: 'paused',
            now,
        });

        // Audit log
        await createAuditLog(ctx, {
            userId: objective.user,
            action: 'objective.paused',
            resourceType: 'objective',
            resourceId: args.id,
            metadata: {
                before: { status: previousStatus },
                after: { status: 'paused' },
                context: `Paused objective: ${objective.title}`,
            },
            severity: 'warning',
        });

        return updated;
    },
});
