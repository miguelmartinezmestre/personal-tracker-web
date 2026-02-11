/**
 * Internal Steps for Objective Lifecycle
 *
 * These steps are called by the workflow and contain the actual business logic.
 * They are designed to be idempotent and safe for retries.
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { computeNextReminderAt } from '../utils/reminderSchedule';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_DAYS = 3;

/**
 * Step: Check if objective should be auto-completed
 * Called when progress reaches or exceeds target value
 */
export const checkAutoComplete = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            return { status: 'not_found', shouldComplete: false };
        }

        if (objective.status === 'completed') {
            return { status: 'already_completed', shouldComplete: false };
        }

        const direction = objective.direction ?? 'increase';
        const shouldComplete =
            direction === 'decrease'
                ? objective.currentValue <= objective.targetValue
                : objective.currentValue >= objective.targetValue;

        if (shouldComplete) {
            const now = Date.now();
            await ctx.db.patch('objectives', args.objectiveId, {
                status: 'completed',
                nextReminderAt: undefined,
                updatedAt: now,
            });

            await ctx.db.insert('notifications', {
                userId: objective.userId,
                organizationId: objective.organizationId ?? '',
                objective: args.objectiveId,
                read: false,
                notificationType: 'status',
                notificationDate: now,
                message: `Your objective "${objective.title}" has been completed!`,
                createdAt: now,
                updatedAt: now,
            });
        }

        return {
            status: shouldComplete ? 'completed' : 'active',
            shouldComplete,
            currentValue: objective.currentValue,
            targetValue: objective.targetValue,
        };
    },
});

/**
 * Step: Send reminder notification for objective
 * Uses a deduplication key to avoid duplicate notifications
 */
export const sendReminder = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        reminderType: v.string(), // 'deadline_approaching' | 'stagnation' | 'weekly_check'
        dedupeKey: v.optional(v.string()), // For idempotency
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective || objective.status === 'completed') {
            return { sent: false, reason: 'not_found_or_completed' };
        }

        if (objective.status !== 'active') {
            return { sent: false, reason: 'not_active' };
        }

        // Check dedupe - if we already sent this reminder recently, skip
        if (args.dedupeKey) {
            const existingNotification = await ctx.db
                .query('notifications')
                .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
                .filter(q => q.eq(q.field('notificationType'), 'reminder'))
                .first();

            if (existingNotification) {
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                if (existingNotification.createdAt > oneDayAgo) {
                    return { sent: false, reason: 'recently_sent', dedupeKey: args.dedupeKey };
                }
            }
        }

        const now = Date.now();
        let message = '';

        switch (args.reminderType) {
            case 'deadline_approaching':
                if (!objective.deadline) {
                    return { sent: false, reason: 'no_deadline' };
                }
                const daysUntilDeadline = Math.ceil(
                    (objective.deadline - now) / (24 * 60 * 60 * 1000)
                );
                message = `Reminder: Your objective "${objective.title}" has ${daysUntilDeadline} days until deadline.`;
                break;
            case 'stagnation':
                const daysSinceUpdate = Math.floor(
                    (now - objective.updatedAt) / (24 * 60 * 60 * 1000)
                );
                message = `Your objective "${objective.title}" hasn't been updated in ${daysSinceUpdate} days. Keep the momentum!`;
                break;
            case 'weekly_check':
                message = `Weekly check-in: How is your objective "${objective.title}" progressing?`;
                break;
            default:
                message = `Reminder about your objective: "${objective.title}"`;
        }

        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId ?? '',
            objective: args.objectiveId,
            read: false,
            notificationType: 'reminder',
            notificationDate: now,
            message,
            createdAt: now,
            updatedAt: now,
        });

        return { sent: true, dedupeKey: args.dedupeKey };
    },
});

/**
 * Step: Mark objective as stalled (no updates for extended period)
 * This could trigger other workflows like escalation
 */
export const markStalled = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
        stalledDays: v.number(),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective || objective.status === 'completed') {
            return { marked: false };
        }

        const now = Date.now();
        if (objective.status !== 'active') {
            return { marked: false, reason: 'not_active' };
        }
        const lastProgressAt = objective.lastProgressAt ?? objective.createdAt;
        const daysSinceUpdate = Math.floor((now - lastProgressAt) / DAY_MS);

        if (daysSinceUpdate >= args.stalledDays) {
            if (objective.lastStalledNotifiedAt && now - objective.lastStalledNotifiedAt < DAY_MS) {
                return { marked: false, reason: 'recently_notified' };
            }
            // We could add a 'stalled' flag to the schema, but for now we just create a notification
            await ctx.db.insert('notifications', {
                userId: objective.userId,
                organizationId: objective.organizationId ?? '',
                objective: args.objectiveId,
                read: false,
                notificationType: 'reminder',
                notificationDate: now,
                message: `Your objective "${objective.title}" has been inactive for ${daysSinceUpdate} days. Consider updating or closing it.`,
                createdAt: now,
                updatedAt: now,
            });
            await ctx.db.patch('objectives', args.objectiveId, {
                lastStalledNotifiedAt: now,
                updatedAt: now,
            });
            return { marked: true, daysSinceUpdate };
        }

        return { marked: false, daysSinceUpdate };
    },
});

/**
 * Step: Calculate if objective is overdue
 */
export const checkOverdue = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective || objective.status === 'completed') {
            return { isOverdue: false };
        }

        if (objective.status !== 'active') {
            return { isOverdue: false, reason: 'not_active' };
        }

        if (!objective.deadline) {
            return { isOverdue: false, reason: 'no_deadline' };
        }

        const now = Date.now();
        const startOfDayUtc = (timestamp: number) => {
            const date = new Date(timestamp);
            date.setUTCHours(0, 0, 0, 0);
            return date.getTime();
        };

        const isOverdue = now > objective.deadline;
        const daysUntil = Math.ceil((objective.deadline - now) / DAY_MS);
        const shouldNotify = isOverdue || daysUntil <= DEADLINE_SOON_DAYS;

        if (!shouldNotify) {
            return { isOverdue, deadline: objective.deadline, shouldNotify: false };
        }

        const lastNotifiedAt = objective.lastDeadlineNotifiedAt ?? 0;
        if (startOfDayUtc(lastNotifiedAt) === startOfDayUtc(now)) {
            return {
                isOverdue,
                deadline: objective.deadline,
                shouldNotify: false,
                reason: 'recently_notified',
            };
        }

        let message = '';
        if (isOverdue) {
            const daysOverdue = Math.max(1, Math.ceil((now - objective.deadline) / DAY_MS));
            message = `Your objective "${objective.title}" is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.`;
        } else if (daysUntil <= 0) {
            message = `Your objective "${objective.title}" is due today.`;
        } else {
            message = `Your objective "${objective.title}" is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`;
        }

        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId ?? '',
            objective: args.objectiveId,
            read: false,
            notificationType: 'deadline',
            notificationDate: now,
            message,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.patch('objectives', args.objectiveId, {
            lastDeadlineNotifiedAt: now,
            updatedAt: now,
        });

        return { isOverdue, deadline: objective.deadline, shouldNotify: true };
    },
});

/**
 * Step: Send periodic reminder based on reminderInterval
 * - monthly: every month
 * - biweekly: twice per month (1st/15th)
 */
export const sendPeriodicReminder = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective || objective.status === 'completed') {
            return { sent: false, reason: 'not_found_or_completed' };
        }

        if (objective.status !== 'active') {
            return { sent: false, reason: 'not_active' };
        }

        const interval = objective.reminderInterval ?? 'none';
        if (interval === 'none') {
            return { sent: false, reason: 'no_interval' };
        }

        const now = Date.now();
        const nextReminderAt = objective.nextReminderAt;
        if (!nextReminderAt) {
            const initialNext = computeNextReminderAt(interval, now);
            await ctx.db.patch('objectives', args.objectiveId, {
                nextReminderAt: initialNext,
                updatedAt: now,
            });
            return { sent: false, reason: 'scheduled_initial', nextReminderAt: initialNext };
        }

        if (now < nextReminderAt) {
            return { sent: false, reason: 'not_due' };
        }

        const computedNext = computeNextReminderAt(interval, now);

        await ctx.db.insert('notifications', {
            userId: objective.userId,
            organizationId: objective.organizationId ?? '',
            objective: args.objectiveId,
            read: false,
            notificationType: 'reminder',
            notificationDate: now,
            message: `Reminder: Update progress for "${objective.title}" (${interval === 'monthly' ? 'monthly' : 'twice per month'}).`,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.patch('objectives', args.objectiveId, {
            nextReminderAt: computedNext,
            updatedAt: now,
        });

        return { sent: true, nextReminderAt: computedNext };
    },
});

/**
 * Step: Create a new recurring instance when an objective completes
 * This creates a copy of the completed objective with reset values for the next period
 */
export const createRecurringInstance = internalMutation({
    args: {
        sourceObjectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const sourceObjective = await ctx.db.get('objectives', args.sourceObjectiveId);
        if (!sourceObjective) {
            return { created: false, reason: 'source_not_found' };
        }

        // Only create recurring instance if the objective has a period set
        if (!sourceObjective.period || sourceObjective.period === 'none') {
            return { created: false, reason: 'not_recurring' };
        }

        const now = Date.now();

        // Calculate next period start
        const periodLengthMs = (sourceObjective.periodLengthDays ?? 30) * 24 * 60 * 60 * 1000;
        const nextPeriodStart = sourceObjective.periodStart
            ? sourceObjective.periodStart + periodLengthMs
            : now;

        // Create new objective instance with reset values
        const newObjectiveId = await ctx.db.insert('objectives', {
            organizationId: sourceObjective.organizationId,
            userId: sourceObjective.userId,
            title: sourceObjective.title,
            description: sourceObjective.description,
            category: sourceObjective.category,
            targetValue: sourceObjective.targetValue,
            currentValue: 0, // Reset to 0 for new period
            deadline: sourceObjective.deadline
                ? sourceObjective.deadline + periodLengthMs
                : undefined,
            status: 'active',
            unit: sourceObjective.unit,
            objectiveType: sourceObjective.objectiveType,
            period: sourceObjective.period,
            periodStart: nextPeriodStart,
            periodLengthDays: sourceObjective.periodLengthDays,
            collaborators: sourceObjective.collaborators,
            createdAt: now,
            updatedAt: now,
        });

        return { created: true, newObjectiveId };
    },
});

/**
 * Step: Check if a recurring objective's period has ended and reset it
 * This resets the currentValue and updates the period start for the next period
 */
export const checkAndResetRecurring = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            return { reset: false, reason: 'not_found' };
        }

        // Only process if it's a recurring objective
        if (!objective.period || objective.period === 'none') {
            return { reset: false, reason: 'not_recurring' };
        }

        // Only reset if objective is active
        if (objective.status !== 'active') {
            return { reset: false, reason: 'not_active' };
        }

        // Check if period has ended
        if (!objective.periodStart || !objective.periodLengthDays) {
            return { reset: false, reason: 'missing_period_config' };
        }

        const now = Date.now();
        const periodLengthMs = objective.periodLengthDays * 24 * 60 * 60 * 1000;
        const periodEnd = objective.periodStart + periodLengthMs;

        // If period hasn't ended yet, no reset needed
        if (now < periodEnd) {
            return { reset: false, reason: 'period_not_ended' };
        }

        // Calculate next period start
        const nextPeriodStart = periodEnd;

        // Reset the objective for the new period
        await ctx.db.patch('objectives', args.objectiveId, {
            currentValue: 0,
            periodStart: nextPeriodStart,
            updatedAt: now,
        });

        return { reset: true, nextPeriodStart };
    },
});
