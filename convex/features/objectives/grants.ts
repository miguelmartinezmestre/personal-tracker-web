import { ConvexError } from 'convex/values';
import type { Doc } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { MAX_OBJECTIVE_GRANTS } from './constants';
import { filterMembers } from '../organizations/memberships';

export type UserGrant = { userId: string; access: 'view' | 'edit' };

export async function replaceUserGrants(
    ctx: { db: MutationCtx['db']; runQuery: MutationCtx['runQuery'] },
    objective: Doc<'objectives'>,
    grants: UserGrant[],
    addedBy: string,
    now: number
) {
    const userIds = new Set(grants.map(grant => grant.userId));

    if (grants.length > MAX_OBJECTIVE_GRANTS || userIds.size !== grants.length) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    const members = await filterMembers(ctx, objective.organizationId, [...userIds]);

    if (members.length !== userIds.size) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    const { db } = ctx;

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
