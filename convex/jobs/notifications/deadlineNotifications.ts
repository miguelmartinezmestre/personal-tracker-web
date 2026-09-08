import { toUtcCivilDay } from '../../../shared/civil-date';
import { internal } from '../../_generated/api';
import type { MutationCtx } from '../../_generated/server';
import {
    buildDeadlineMessage,
    getDeadlineDayWindow,
} from '../../domain/notifications/deadlineRules';
import { shouldSendDeadlineNotification } from '../../domain/notifications/preferences';
import { isOperationalMember } from '../../domain/organizations/operational';

const BATCH_SIZE = 100;

export async function runDeadlineNotificationsJob(
    ctx: MutationCtx,
    args: {
        cursor?: string | null;
        runAt?: number;
        created?: number;
        skipped?: number;
        scannedSoFar?: number;
    }
) {
    const now = args.runAt ?? Date.now();
    const { dayStart, dayEnd, scanUpperBound } = getDeadlineDayWindow(now);
    const scanLowerBound = dayStart - 7 * 86_400_000;
    const operationalOrganizations = new Map<string, boolean>();
    let created = args.created || 0;
    let skipped = args.skipped || 0;
    const scannedSoFar = args.scannedSoFar ?? 0;

    const page = await ctx.db
        .query('objectives')
        .withIndex('by_status_deletedAt_deadline', q =>
            q
                .eq('status', 'active')
                .eq('deletedAt', undefined)
                .gte('deadline', scanLowerBound)
                .lt('deadline', scanUpperBound)
        )
        .paginate({
            numItems: BATCH_SIZE,
            cursor: args.cursor ?? null,
        });

    const objectives = page.page;

    const userIds = [...new Set(objectives.map(objective => objective.ownerId))];
    const preferenceMap = new Map<string, boolean>();
    await Promise.all(
        userIds.map(async uid => {
            preferenceMap.set(uid, await shouldSendDeadlineNotification(ctx, uid));
        })
    );
    const existingSet = new Set<string>();

    for (const objective of objectives) {
        const ownerScope = `${objective.organizationId}/${objective.ownerId}`;
        if (!operationalOrganizations.has(ownerScope)) {
            operationalOrganizations.set(
                ownerScope,
                await isOperationalMember(ctx, objective.organizationId, objective.ownerId)
            );
        }
        if (!operationalOrganizations.get(ownerScope)) {
            skipped += 1;
            continue;
        }
        if (objective.deletedAt !== undefined) {
            skipped += 1;
            continue;
        }
        if (!objective.deadline) {
            continue;
        }

        const message = buildDeadlineMessage(objective, now, dayStart, dayEnd);
        if (!message) {
            continue;
        }

        if (!preferenceMap.get(objective.ownerId)) {
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

        let messageKey = 'deadlineUpcoming';
        if (toUtcCivilDay(objective.deadline) < dayEnd) {
            messageKey = 'deadlineToday';
        }
        if (toUtcCivilDay(objective.deadline) < dayStart) {
            messageKey = 'deadlineOverdue';
        }
        await ctx.db.insert('notifications', {
            userId: objective.ownerId,
            organizationId: objective.organizationId,
            objective: objective._id,
            read: false,
            notificationType: 'deadline',
            messageKey,
            messageParams: {
                title: objective.title,
                deadline: toUtcCivilDay(objective.deadline),
                days: Math.abs(
                    Math.round((toUtcCivilDay(objective.deadline) - dayStart) / 86_400_000)
                ),
            },
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
            runAt: now,
            created,
            skipped,
            scannedSoFar: totalScanned,
        });
        return {
            status: 'in_progress' as const,
            processedInBatch: batchScanned,
            scannedSoFar: totalScanned,
            createdSoFar: created,
            skippedSoFar: skipped,
        };
    }

    return {
        status: 'completed' as const,
        scanned: totalScanned,
        created,
        skipped,
    };
}
