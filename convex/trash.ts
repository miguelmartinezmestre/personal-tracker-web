import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { deleteObjectiveBatch, requireManagedTrashObjective } from './features/objectives/deletion';
import { requireOrganizationId, toObjectiveSummaries } from './features/objectives/records';
import { internalMutation } from './features/objectives/stats';
import { objectiveListValidator } from './features/objectives/validators';
import { isOrganizationAdminRole } from './features/organizations/roles';

export const listTrash = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: objectiveListValidator,
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);
        const isManager = isOrganizationAdminRole(ctx.memberRole);

        // Most recently deleted first; members only see the trash of the objectives they created.
        const result = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_createdAt', q =>
                q.eq('organizationId', organizationId).gte('deletedAt', 0)
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        const isManaged = (doc: { createdBy: Id<'user'>; purgeToken?: string }) =>
            (isManager || doc.createdBy === ctx.userId) && doc.purgeToken === undefined;

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'objectives',
                index: 'by_organization_deletedAt_createdAt',
                prefix: [organizationId],
                indexKey: doc => [doc.organizationId, doc.deletedAt, doc.createdAt],
                paginationOpts: args.paginationOpts,
                // The next-page check would otherwise walk into the live objectives below.
                isLive: doc => doc.deletedAt !== undefined && isManaged(doc),
            },
            result,
            await toObjectiveSummaries(ctx.db, ctx, result.page.filter(isManaged))
        );
    },
});

export const restoreObjective = mutationWithRLS({
    args: { id: v.id('objectives') },
    returns: v.null(),
    handler: async (ctx, args) => {
        await requireManagedTrashObjective(ctx, args.id);
        await ctx.db.patch('objectives', args.id, {
            deletedAt: undefined,
            deletedBy: undefined,
            updatedAt: Date.now(),
        });

        return null;
    },
});

export const purgeObjective = mutationWithRLS({
    args: { id: v.id('objectives') },
    returns: v.null(),
    handler: async (ctx, args) => {
        await requireManagedTrashObjective(ctx, args.id);
        const purgeToken = crypto.randomUUID();
        await ctx.db.patch('objectives', args.id, { purgeToken, purgeStartedAt: Date.now() });

        if (!(await deleteObjectiveBatch(ctx.db, args.id))) {
            await ctx.scheduler.runAfter(0, internal.trash.continuePurgeObjective, {
                objectiveId: args.id,
                purgeToken,
            });
        }

        return null;
    },
});

export const continuePurgeObjective = internalMutation({
    args: { objectiveId: v.id('objectives'), purgeToken: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);

        // A continuation from an earlier purge has nothing left to do.
        if (objective?.purgeToken !== args.purgeToken) {
            return null;
        }

        if (!(await deleteObjectiveBatch(ctx.db, args.objectiveId))) {
            await ctx.scheduler.runAfter(0, internal.trash.continuePurgeObjective, args);
        }

        return null;
    },
});
