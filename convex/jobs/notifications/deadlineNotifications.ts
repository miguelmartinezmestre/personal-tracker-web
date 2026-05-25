import { internal } from '../../_generated/api';
import type { MutationCtx } from '../../_generated/server';
import {
    buildDeadlineMessage,
    getDeadlineDayWindow,
} from '../../domain/notifications/deadlineRules';
import { shouldSendDeadlineNotification } from '../../domain/notifications/preferences';

const BATCH_SIZE = 100;

export async function runDeadlineNotificationsJob(
    ctx: MutationCtx,
    args: {
        cursor?: string | null;
        created?: number;
        skipped?: number;
        scannedSoFar?: number;
    }
) {
    const now = Date.now();
    const { dayStart, dayEnd } = getDeadlineDayWindow(now);
    let created = args.created || 0;
    let skipped = args.skipped || 0;
    const scannedSoFar = args.scannedSoFar ?? 0;

    const page = await ctx.db
        .query('objectives')
        .withIndex('by_status_deadline', q => q.eq('status', 'active').lt('deadline', dayEnd))
        .paginate({
            numItems: BATCH_SIZE,
            cursor: args.cursor ?? null,
        });

    const objectives = page.page;

    const userIds = [...new Set(objectives.map(objective => objective.userId))];
    const preferenceMap = new Map<string, boolean>();
    await Promise.all(
        userIds.map(async uid => {
            preferenceMap.set(uid, await shouldSendDeadlineNotification(ctx, uid));
        })
    );
    const existingSet = new Set<string>();

    for (const objective of objectives) {
        if (!objective.deadline) continue;

        const message = buildDeadlineMessage(objective, now, dayStart, dayEnd);
        if (!message) continue;

        if (!preferenceMap.get(objective.userId)) {
            skipped += 1;
            continue;
        }

        if (existingSet.has(objective._id)) {
            skipped += 1;
            continue;
        }

        const existingNotification = await ctx.db
            .query('notifications')
            .withIndex('by_objective_type_date', q =>
                q
                    .eq('objective', objective._id)
                    .eq('notificationType', 'deadline')
                    .gte('notificationDate', dayStart)
                    .lt('notificationDate', dayEnd)
            )
            .first();

        if (existingNotification) {
            existingSet.add(objective._id);
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

        existingSet.add(objective._id);
        created += 1;
    }

    const batchScanned = objectives.length;
    const totalScanned = scannedSoFar + batchScanned;

    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.notifications.runDeadlineNotificationsCron, {
            cursor: page.continueCursor,
            created,
            skipped,
            scannedSoFar: totalScanned,
        });
        return {
            status: 'in_progress',
            processedInBatch: batchScanned,
            scannedSoFar: totalScanned,
            createdSoFar: created,
            skippedSoFar: skipped,
        };
    }

    return {
        status: 'completed',
        scanned: totalScanned,
        created,
        skipped,
    };
}
