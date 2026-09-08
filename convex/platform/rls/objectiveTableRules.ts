import type { Doc } from '../../_generated/dataModel';
import { canEditProgress, canObjective } from '../../domain/objectives/permissions';
import { rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

export function objectiveTableRules(helpers: RlsHelpers) {
    const {
        ctx,
        userId,
        isGlobalAdmin,
        isActiveOrganization,
        canAccessObjectiveOrg,
        buildSubject,
    } = helpers;

    return {
        objectives: {
            read: async (_ctx: QueryLike, objective: Doc<'objectives'>) => {
                if (!canAccessObjectiveOrg(objective)) {
                    return false;
                }
                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: (_ctx: QueryLike, objective: RlsInsertDoc<'objectives'>) =>
                rlsWhen(canAccessObjectiveOrg(objective)),
            modify: async (_ctx: QueryLike, objective: Doc<'objectives'>) => {
                if (!canAccessObjectiveOrg(objective)) {
                    return false;
                }
                const subject = await buildSubject(objective._id);
                return (
                    canObjective('editDefinition', subject, objective) ||
                    canObjective('delete', subject, objective) ||
                    canObjective('restore', subject, objective) ||
                    canObjective('setVisibility', subject, objective) ||
                    canObjective('transferOwnership', subject, objective) ||
                    canObjective('contributeProgress', subject, objective)
                );
            },
        },
        objectiveCollaborators: {
            read: async (_ctx: QueryLike, collaborator: Doc<'objectiveCollaborators'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (!isActiveOrganization(collaborator.organizationId)) {
                    return false;
                }
                if (collaborator.userId === userId) {
                    return true;
                }

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: async (
                _ctx: QueryLike,
                collaborator: RlsInsertDoc<'objectiveCollaborators'>
            ) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (!isActiveOrganization(collaborator.organizationId)) {
                    return false;
                }

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canObjective('manageCollaborators', subject, objective);
            },
            modify: async (_ctx: QueryLike, collaborator: Doc<'objectiveCollaborators'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (!isActiveOrganization(collaborator.organizationId)) {
                    return false;
                }

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canObjective('manageCollaborators', subject, objective);
            },
        },
        progressUpdates: {
            read: async (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: async (_ctx: QueryLike, progressUpdate: RlsInsertDoc<'progressUpdates'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canObjective('contributeProgress', subject, objective);
            },
            modify: async (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) {
                    return false;
                }

                const subject = await buildSubject(objective._id);
                return canEditProgress(subject, {
                    authorId: progressUpdate.createdBy,
                    ownerId: objective.ownerId,
                });
            },
        },
    };
}

type QueryLike = RlsHelpers['ctx'];
