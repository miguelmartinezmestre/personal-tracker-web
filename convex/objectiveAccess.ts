import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { memberAccessFields, memberAccessLevel } from './features/objectives/access';
import {
    MAX_OBJECTIVE_GRANTS,
    MEMBER_ACCESS_REMOVAL_BATCH_SIZE,
} from './features/objectives/constants';
import { replaceUserGrants } from './features/objectives/grants';
import { requireObjective, requireOrganizationId } from './features/objectives/records';
import {
    accessLevelValidator,
    objectiveAccessValidator,
    userGrantValidator,
} from './features/objectives/validators';
import { insertAuditLog } from './features/audit/log';

export const getObjectiveAccess = queryWithRLS({
    args: { objectiveId: v.id('objectives') },
    returns: objectiveAccessValidator,
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { objective, access } = await requireObjective(ctx.db, ctx, args.objectiveId);

        if (!access.canManage) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        const grants = await ctx.db
            .query('objectivePermissions')
            .withIndex('by_objective_user', q => q.eq('objectiveId', objective._id))
            .take(MAX_OBJECTIVE_GRANTS);

        const users = await Promise.all(
            grants.map(async grant => {
                const user = await ctx.db.get('user', grant.userId);
                const level: 'view' | 'edit' = grant.canEdit ? 'edit' : 'view';

                return {
                    userId: grant.userId,
                    name: user?.name ?? '',
                    email: user?.email ?? '',
                    access: level,
                };
            })
        );

        return { memberAccess: memberAccessLevel(objective), users };
    },
});

export const updateObjectiveAccess = mutationWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        memberAccess: accessLevelValidator,
        users: v.array(userGrantValidator),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        requireOrganizationId(ctx.organizationId);
        const { objective, access } = await requireObjective(ctx.db, ctx, args.objectiveId);

        if (!access.canManage) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_OBJECTIVE);
        }

        const now = Date.now();

        await ctx.db.patch('objectives', objective._id, {
            ...memberAccessFields(args.memberAccess),
            updatedAt: now,
        });
        await replaceUserGrants(ctx.db, objective, args.users, ctx.userId, now);
        await insertAuditLog(ctx, {
            action: 'objective.access_changed',
            resourceType: 'objective',
            resourceId: objective._id,
            userId: objective.createdBy,
            organizationId: objective.organizationId,
            severity: 'warning',
            metadata: {
                after: {
                    memberAccess: args.memberAccess,
                    userGrantCount: args.users.length,
                },
            },
        });

        return null;
    },
});

export const removeMemberAccess = internalMutation({
    args: { userId: v.id('user'), organizationId: v.id('organization') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const grants = await ctx.db
            .query('objectivePermissions')
            .withIndex('by_user_organization', q =>
                q.eq('userId', args.userId).eq('organizationId', args.organizationId)
            )
            .take(MEMBER_ACCESS_REMOVAL_BATCH_SIZE);

        for (const grant of grants) {
            await ctx.db.delete('objectivePermissions', grant._id);
        }

        if (grants.length === MEMBER_ACCESS_REMOVAL_BATCH_SIZE) {
            await ctx.scheduler.runAfter(0, internal.objectiveAccess.removeMemberAccess, args);
        }

        return null;
    },
});
