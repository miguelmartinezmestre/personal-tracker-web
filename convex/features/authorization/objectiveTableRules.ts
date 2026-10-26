import type { Doc, Id } from '../../_generated/dataModel';
import { canViewObjective, objectiveAccess } from '../objectives/access';
import { rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

export function objectiveTableRules(helpers: RlsHelpers) {
    const { ctx, userId, isActiveOrganization } = helpers;

    const objectiveVisibility = new Map<Id<'objectives'>, Promise<boolean>>();

    const canViewObjectiveById = (objectiveId: Id<'objectives'>) => {
        if (!objectiveVisibility.has(objectiveId)) {
            objectiveVisibility.set(
                objectiveId,
                ctx.db
                    .get('objectives', objectiveId)
                    .then(
                        objective =>
                            objective !== null && canViewObjective(ctx.db, helpers, objective)
                    )
            );
        }

        return objectiveVisibility.get(objectiveId) ?? rlsDeny();
    };

    const canManageObjectiveById = async (objectiveId: Id<'objectives'>) => {
        const objective = await ctx.db.get('objectives', objectiveId);

        return objective !== null && (await objectiveAccess(ctx.db, helpers, objective)).canManage;
    };

    return {
        objectives: {
            read: (_ctx: QueryLike, objective: Doc<'objectives'>) =>
                canViewObjective(ctx.db, helpers, objective),
            insert: (_ctx: QueryLike, objective: RlsInsertDoc<'objectives'>) =>
                rlsWhen(isActiveOrganization(objective.organizationId)),
            modify: async (_ctx: QueryLike, objective: Doc<'objectives'>) =>
                (await objectiveAccess(ctx.db, helpers, objective)).canEdit,
        },
        objectivePermissions: {
            read: async (_ctx: QueryLike, permission: Doc<'objectivePermissions'>) =>
                permission.userId === userId ||
                (await canManageObjectiveById(permission.objectiveId)),
            insert: (_ctx: QueryLike, permission: RlsInsertDoc<'objectivePermissions'>) =>
                canManageObjectiveById(permission.objectiveId),
            modify: (_ctx: QueryLike, permission: Doc<'objectivePermissions'>) =>
                canManageObjectiveById(permission.objectiveId),
        },
        progressUpdates: {
            read: (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) =>
                canViewObjectiveById(progressUpdate.objective),
            insert: (_ctx: QueryLike, progressUpdate: RlsInsertDoc<'progressUpdates'>) =>
                rlsWhen(isActiveOrganization(progressUpdate.organizationId)),
            modify: (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) =>
                rlsWhen(isActiveOrganization(progressUpdate.organizationId)),
        },
    };
}
