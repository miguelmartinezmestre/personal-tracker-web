import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { authComponent } from './auth';
import { internalMutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { paginationOptsValidator } from 'convex/server';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_DAYS = 3;

const startOfDayUtc = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

const buildDeadlineMessage = (
    objective: Doc<'objectives'>,
    now: number,
    dayStart: number,
    dayEnd: number
) => {
    if (!objective.deadline) return null;

    if (objective.deadline <= now) {
        const daysOverdue = Math.max(1, Math.ceil((now - objective.deadline) / DAY_MS));
        return `Objective \"${objective.title}\" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(objective.deadline)}).`;
    }

    const isDueToday = objective.deadline >= dayStart && objective.deadline < dayEnd;
    if (isDueToday) {
        return `Objective \"${objective.title}\" is due today (${formatDate(objective.deadline)}).`;
    }

    const daysUntil = Math.ceil((objective.deadline - now) / DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) return null;

    return `Objective \"${objective.title}\" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(objective.deadline)}).`;
};

export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = String(ctx.identity?.subject);
        const results = await ctx.db
            .query('notifications')
            .withIndex('by_user_date', q => q.eq('user', userId))
            .order('desc')
            .paginate(paginationOpts);

        return {
            page: results.page,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const createNotification = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        notificationType: v.string(),
        notificationDate: v.optional(v.number()),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        // Try to get user from betterAuth, but fall back to identity for tests
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
        const userId = String(ctx.identity?.subject);
        if (!userId) throw new Error('User not authenticated');

        // Only check user._id if betterAuth is available (not in tests)
        if (user && !user._id) throw new Error('User not authenticated');

        const objective = await ctx.db.get(args.objective);
        if (!objective) throw new Error('Objective not found');

        const role = String(ctx.identity?.role ?? 'user');
        const isAdmin = role === 'admin' || role === 'ADMIN';
        if (!isAdmin && objective.user !== userId) {
            throw new Error('Not authorized to create notifications for this objective');
        }

        const now = Date.now();
        const notificationDate = args.notificationDate ?? now;

        const id = await ctx.db.insert('notifications', {
            user: userId,
            objective: args.objective,
            read: false,
            notificationType: args.notificationType,
            notificationDate,
            message: args.message,
            createdAt: now,
            updatedAt: now,
        });

        return await ctx.db.get(id);
    },
});

export const setNotificationRead = mutationWithRLS({
    args: {
        id: v.id('notifications'),
        read: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { read: args.read, updatedAt: Date.now() });
        return await ctx.db.get(args.id);
    },
});

export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();
        const now = Date.now();
        let updated = 0;

        for (const notification of notifications) {
            if (!notification.read) {
                await ctx.db.patch(notification._id, { read: true, updatedAt: now });
                updated += 1;
            }
        }

        return { updated };
    },
});

export const deleteNotification = mutationWithRLS({
    args: {
        id: v.id('notifications'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return 'Notification deleted successfully' as const;
    },
});

export const runDeadlineNotificationsCron = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const dayStart = startOfDayUtc(now);
        const dayEnd = dayStart + DAY_MS;

        const objectives = (await ctx.db.query('objectives').collect()) as Doc<'objectives'>[];
        let created = 0;
        let skipped = 0;

        for (const objective of objectives) {
            if (!objective.deadline) continue;
            if (objective.status === 'completed' || objective.status === 'archived') continue;

            const message = buildDeadlineMessage(objective, now, dayStart, dayEnd);
            if (!message) continue;

            const existing = await ctx.db
                .query('notifications')
                .withIndex('by_objective', q => q.eq('objective', objective._id))
                .filter(q =>
                    q.and(
                        q.eq(q.field('notificationType'), 'deadline'),
                        q.gte(q.field('notificationDate'), dayStart),
                        q.lt(q.field('notificationDate'), dayEnd)
                    )
                )
                .first();

            if (existing) {
                skipped += 1;
                continue;
            }

            await ctx.db.insert('notifications', {
                user: objective.user,
                objective: objective._id,
                read: false,
                notificationType: 'deadline',
                notificationDate: now,
                message,
                createdAt: now,
                updatedAt: now,
            });

            created += 1;
        }

        return { scanned: objectives.length, created, skipped };
    },
});
