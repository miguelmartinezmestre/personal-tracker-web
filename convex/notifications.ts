import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { internalMutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { paginationOptsValidator } from 'convex/server';
import { notificationTypeValidator } from './utils/validators';

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
        return `Objective "${objective.title}" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(objective.deadline)}).`;
    }

    const isDueToday = objective.deadline >= dayStart && objective.deadline < dayEnd;
    if (isDueToday) {
        return `Objective "${objective.title}" is due today (${formatDate(objective.deadline)}).`;
    }

    const daysUntil = Math.ceil((objective.deadline - now) / DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) return null;

    return `Objective "${objective.title}" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(objective.deadline)}).`;
};

export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = ctx.userId;
        const results = await ctx.db
            .query('notifications')
            .withIndex('by_user_date', q => q.eq('userId', userId))
            .order('desc')
            .paginate(paginationOpts);

        return {
            page: results.page,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const getUnreadNotificationCount = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;
        const unreadNotifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
            .collect();

        return { count: unreadNotifications.length };
    },
});

export const createNotification = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        notificationType: notificationTypeValidator,
        notificationDate: v.optional(v.number()),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = ctx.userId;

        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) throw new Error('Objective not found');

        const role = ctx.role;
        const isAdmin = role === 'admin' || role === 'ADMIN';
        const isOwner = objective.userId === userId;
        const isOrganizationMember =
            objective.scope === 'organization' &&
            Boolean(ctx.organizationId) &&
            objective.organizationId === ctx.organizationId;
        if (!isAdmin && !isOwner && !isOrganizationMember) {
            throw new Error('Not authorized to create notifications for this objective');
        }

        const now = Date.now();
        const notificationDate = args.notificationDate ?? now;

        const id = await ctx.db.insert('notifications', {
            userId: userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: args.notificationType as
                | 'deadline'
                | 'progress'
                | 'status'
                | 'achievement'
                | 'reminder',
            notificationDate,
            message: args.message,
            createdAt: now,
            updatedAt: now,
        });

        return await ctx.db.get('notifications', id);
    },
});

export const setNotificationRead = mutationWithRLS({
    args: {
        id: v.id('notifications'),
        read: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch('notifications', args.id, { read: args.read, updatedAt: Date.now() });
        return await ctx.db.get('notifications', args.id);
    },
});

export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;
        // Only fetch unread notifications using the by_user_read index
        const unreadNotifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
            .collect();
        const now = Date.now();

        for (const notification of unreadNotifications) {
            await ctx.db.patch('notifications', notification._id, {
                read: true,
                updatedAt: now,
            });
        }

        return { updated: unreadNotifications.length };
    },
});

export const deleteNotification = mutationWithRLS({
    args: {
        id: v.id('notifications'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete('notifications', args.id);
        return 'Notification deleted successfully' as const;
    },
});

export const runDeadlineNotificationsCron = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const dayStart = startOfDayUtc(now);
        const dayEnd = dayStart + DAY_MS;

        // Only scan active objectives (not completed/archived/deleted/paused)
        const objectives = (await ctx.db
            .query('objectives')
            .withIndex('by_status', q => q.eq('status', 'active'))
            .collect()) as Doc<'objectives'>[];
        let created = 0;
        let skipped = 0;

        for (const objective of objectives) {
            if (!objective.deadline) continue;

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
                userId: objective.userId,
                organizationId: objective.organizationId,
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
