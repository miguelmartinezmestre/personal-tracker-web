import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import type { AccessActor } from './access';
import { OBJECTIVE_DELETION_BATCH_SIZE } from './constants';
import { requireObjective, requireOrganizationId } from './records';

// Restoring and purging are for whoever could delete it: its creator, the owner and the admins (P3).
export async function requireManagedTrashObjective(
    ctx: MutationCtx & AccessActor,
    objectiveId: Id<'objectives'>
) {
    requireOrganizationId(ctx.organizationId);

    const { objective, access } = await requireObjective(ctx.db, ctx, objectiveId, {
        inTrash: true,
    });

    if (!access.canManage) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
    }

    // Once a purge has started the objective is on its way out and can't come back.
    if (objective.purgeToken !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    return objective;
}

/**
 * Deletes one batch of the objective's progress, permissions and notifications (INH-NOT-08), and
 * the objective itself once they are gone. Returns false while rows remain, so the caller
 * reschedules.
 */
export async function deleteObjectiveBatch(
    db: MutationCtx['db'],
    objectiveId: Id<'objectives'>
): Promise<boolean> {
    const progress = await db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
        .take(OBJECTIVE_DELETION_BATCH_SIZE);

    for (const row of progress) {
        await db.delete('progressUpdates', row._id);
    }

    const permissions = await db
        .query('objectivePermissions')
        .withIndex('by_objective_user', q => q.eq('objectiveId', objectiveId))
        .take(OBJECTIVE_DELETION_BATCH_SIZE - progress.length);

    for (const row of permissions) {
        await db.delete('objectivePermissions', row._id);
    }

    const notifications = await db
        .query('notifications')
        .withIndex('by_objective_type_date', q => q.eq('objective', objectiveId))
        .take(OBJECTIVE_DELETION_BATCH_SIZE - progress.length - permissions.length);

    for (const row of notifications) {
        await db.delete('notifications', row._id);
    }

    if (
        progress.length + permissions.length + notifications.length ===
        OBJECTIVE_DELETION_BATCH_SIZE
    ) {
        return false;
    }

    if (await db.get('objectives', objectiveId)) {
        await db.delete('objectives', objectiveId);
    }

    return true;
}
