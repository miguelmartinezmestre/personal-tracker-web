import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { measurement, requireObjective, requireOrganizationId, roundStoredValue } from './records';
import type { AccessActor, ObjectiveAccess } from './access';

// Logging and correcting progress, anyone's entries included, is editing the objective (P4).
// A completed objective is closed: no new entries and no corrections (decision 11).
export function requireEditableObjective(objective: Doc<'objectives'>, access: ObjectiveAccess) {
    if (!access.canEdit) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
    }

    if (objective.status === 'completed') {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    }

    return objective;
}

// Progress changes adjust the total by their difference, without walking the history.
export async function applyDifference(
    ctx: MutationCtx,
    objective: Doc<'objectives'>,
    difference: number,
    now: number
) {
    await ctx.db.patch('objectives', objective._id, {
        ...measurement(objective, roundStoredValue(objective.currentValue + difference), now),
        updatedAt: now,
    });
}

export async function requireEditableEntry(
    ctx: MutationCtx & AccessActor,
    id: Id<'progressUpdates'>
) {
    const organizationId = requireOrganizationId(ctx.organizationId);
    const entry = await ctx.db.get('progressUpdates', id);

    if (!entry || entry.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    const { objective, access } = await requireObjective(ctx.db, ctx, entry.objective);

    return { entry, objective: requireEditableObjective(objective, access) };
}
