import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { MAX_OBJECTIVE_GRANTS } from './constants';

export type UserGrant = { userId: Id<'user'>; access: 'view' | 'edit' };

/** Makes the objective's individual permissions exactly `grants`, all for current members. */
export async function replaceUserGrants(
    db: MutationCtx['db'],
    objective: Doc<'objectives'>,
    grants: UserGrant[],
    addedBy: Id<'user'>,
    now: number
) {
    const userIds = new Set(grants.map(grant => grant.userId));

    if (grants.length > MAX_OBJECTIVE_GRANTS || userIds.size !== grants.length) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    for (const userId of userIds) {
        const membership = await db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', objective.organizationId).eq('userId', userId)
            )
            .first();

        if (!membership) {
            throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
        }
    }

    const existing = await db
        .query('objectivePermissions')
        .withIndex('by_objective_user', q => q.eq('objectiveId', objective._id))
        .take(MAX_OBJECTIVE_GRANTS + 1);

    for (const row of existing) {
        const grant = grants.find(candidate => candidate.userId === row.userId);

        if (!grant) {
            await db.delete('objectivePermissions', row._id);
        } else if (row.canEdit !== (grant.access === 'edit')) {
            await db.patch('objectivePermissions', row._id, {
                canEdit: grant.access === 'edit',
                updatedAt: now,
            });
        }
    }

    for (const grant of grants) {
        if (!existing.some(row => row.userId === grant.userId)) {
            await db.insert('objectivePermissions', {
                objectiveId: objective._id,
                organizationId: objective.organizationId,
                userId: grant.userId,
                canEdit: grant.access === 'edit',
                addedBy,
                createdAt: now,
                updatedAt: now,
            });
        }
    }
}
