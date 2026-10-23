import type { Doc, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import type { objectiveStats } from '../objectives/stats';
import { isOrganizationAdminRole } from '../organizations/roles';

export type StatsQuery = Parameters<typeof objectiveStats.countBatch>[1][number];

export type Totals = { total: number; completed: number; progressSum: number };

export const emptyTotals = (): Totals => ({ total: 0, completed: 0, progressSum: 0 });

export function average(sum: number, count: number): number {
    return count === 0 ? 0 : Math.round(sum / count);
}

/**
 * Private objectives the user can see without managing the organization: their own and those
 * shared with them individually. The aggregate only counts what the member role sees (P10).
 */
export async function visiblePrivateObjectives(
    db: QueryCtx['db'],
    organizationId: Id<'organization'>,
    userId: Id<'user'>
) {
    const objectives: Doc<'objectives'>[] = [];

    for await (const objective of db
        .query('objectives')
        .withIndex('by_organization_creator_memberCanView_deletedAt', q =>
            q
                .eq('organizationId', organizationId)
                .eq('createdBy', userId)
                .eq('memberCanView', false)
                .eq('deletedAt', undefined)
        )) {
        objectives.push(objective);
    }

    for await (const grant of db
        .query('objectivePermissions')
        .withIndex('by_user_organization', q =>
            q.eq('userId', userId).eq('organizationId', organizationId)
        )) {
        const objective = await db.get('objectives', grant.objectiveId);

        if (
            objective &&
            objective.deletedAt === undefined &&
            !objective.memberCanView &&
            objective.createdBy !== userId
        ) {
            objectives.push(objective);
        }
    }

    return objectives;
}

export async function visibilityGroups(
    ctx: QueryCtx & { memberRole: string | null; userId: Id<'user'> },
    organizationId: Id<'organization'>
) {
    const isManager = isOrganizationAdminRole(ctx.memberRole);

    return {
        // Owner and admins see private objectives too, so those come from the aggregates as well.
        memberCanView: isManager ? [true, false] : [true],
        privateObjectives: isManager
            ? []
            : await visiblePrivateObjectives(ctx.db, organizationId, ctx.userId),
    };
}

export async function trashedObjectives(
    db: QueryCtx['db'],
    entries: readonly { objective: Id<'objectives'> }[]
) {
    const inTrash = new Set<Id<'objectives'>>();

    for (const objectiveId of new Set(entries.map(entry => entry.objective))) {
        if ((await db.get('objectives', objectiveId))?.deletedAt !== undefined) {
            inTrash.add(objectiveId);
        }
    }

    return inTrash;
}
