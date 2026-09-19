import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { getCollaboratorRoleForUser } from './collaborators';
import {
    buildObjectiveCapabilities,
    buildPermissionSubject,
    canObjective,
    type ObjectiveAction,
    type ObjectiveCapabilities,
    type PermissionSubject,
} from './permissions';

export type AccessCtx = {
    db: QueryCtx['db'];
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

export async function resolveObjectivePermissionSubject(
    ctx: AccessCtx,
    objective: Pick<Doc<'objectives'>, '_id'>
): Promise<PermissionSubject> {
    const collaboratorRole = await getCollaboratorRoleForUser(ctx, objective._id, ctx.userId);
    return buildPermissionSubject({
        userId: ctx.userId,
        platformRole: ctx.role,
        memberRole: ctx.memberRole,
        collaboratorRole,
    });
}

export async function resolveObjectiveCapabilities(
    ctx: AccessCtx,
    objective: Doc<'objectives'>
): Promise<ObjectiveCapabilities> {
    const subject = await resolveObjectivePermissionSubject(ctx, objective);
    return buildObjectiveCapabilities(subject, objective);
}

export async function assertObjectiveAction(
    ctx: AccessCtx,
    objective: Doc<'objectives'>,
    action: ObjectiveAction
): Promise<PermissionSubject> {
    // RLS has already scoped this row to the active organization (or global admin).
    // Keep the domain check focused on the action-specific invariant.
    const subject = await resolveObjectivePermissionSubject(ctx, objective);

    if (!canObjective(action, subject, objective)) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
    }

    return subject;
}

export function enrichObjectiveWithCapabilities(
    objective: Doc<'objectives'>,
    capabilities: ObjectiveCapabilities
) {
    return {
        ...objective,
        capabilities,
    };
}

export async function enrichObjectiveForActor(ctx: AccessCtx, objective: Doc<'objectives'>) {
    return enrichObjectiveWithCapabilities(
        objective,
        await resolveObjectiveCapabilities(ctx, objective)
    );
}

export async function getCategoryForObjective(
    ctx: QueryCtx | MutationCtx,
    organizationId: Id<'organization'>,
    categoryId: Id<'categories'>
): Promise<Doc<'categories'>> {
    const category = await ctx.db.get('categories', categoryId);
    if (!category) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    if (category.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    return category;
}
