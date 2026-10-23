import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { measurement, requireObjective, requireOrganizationId, roundStoredValue } from './records';
import type { AccessActor } from './access';

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

    // Correcting anyone's entries is editing the objective (P4); a completed one is closed (decision 11).
    if (!access.canEdit) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
    }

    if (objective.status === 'completed') {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    }

    return { entry, objective };
}
