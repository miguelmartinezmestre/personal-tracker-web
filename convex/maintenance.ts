import { ConvexError, v } from 'convex/values';
import { internalMutation } from './platform/db/internalMutation';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const maintenanceTable = v.union(
    v.literal('objectives'),
    v.literal('progressUpdates'),
    v.literal('notifications'),
    v.literal('categories'),
    v.literal('objectiveCollaborators'),
    v.literal('auditLogs')
);
type Table =
    | 'objectives'
    | 'progressUpdates'
    | 'notifications'
    | 'categories'
    | 'objectiveCollaborators'
    | 'auditLogs';
type Finding = {
    id: string;
    reason: string;
    action: 'delete' | 'clear_category' | 'clear_creator';
    repaired: boolean;
};

async function inspectRow(
    ctx: MutationCtx,
    table: Table,
    row: Doc<Table>
): Promise<Omit<Finding, 'repaired'> | null> {
    if (!(await ctx.db.get('organization', row.organizationId))) {
        return { id: row._id, reason: 'organization_missing', action: 'delete' };
    }
    if (
        table === 'objectives' &&
        'categoryId' in row &&
        row.categoryId &&
        !(await ctx.db.get('categories', row.categoryId))
    ) {
        return { id: row._id, reason: 'category_missing', action: 'clear_category' };
    }
    if (
        table === 'categories' &&
        'userId' in row &&
        row.userId &&
        !(await ctx.db.get('user', row.userId))
    ) {
        return { id: row._id, reason: 'creator_missing', action: 'clear_creator' };
    }
    let objectiveId: Id<'objectives'> | undefined;
    if ('objective' in row) {
        objectiveId = row.objective;
    }
    if ('objectiveId' in row) {
        objectiveId = row.objectiveId;
    }
    if (objectiveId && !(await ctx.db.get('objectives', objectiveId))) {
        return { id: row._id, reason: 'objective_missing', action: 'delete' };
    }
    return null;
}

export const inspectOrphans = internalMutation({
    args: {
        table: maintenanceTable,
        cursor: v.optional(v.union(v.string(), v.null())),
        organizationId: v.optional(v.id('organization')),
        repair: v.optional(v.boolean()),
    },
    returns: v.object({
        findings: v.array(
            v.object({
                id: v.string(),
                reason: v.string(),
                action: v.union(
                    v.literal('delete'),
                    v.literal('clear_category'),
                    v.literal('clear_creator')
                ),
                repaired: v.boolean(),
            })
        ),
        continueCursor: v.string(),
        isDone: v.boolean(),
    }),
    handler: async (ctx, args) => {
        if (args.repair && !args.organizationId) {
            throw new ConvexError('Repair requires an explicit organizationId');
        }
        const page = await ctx.db
            .query(args.table)
            .paginate({ numItems: 50, cursor: args.cursor ?? null });
        const findings: Finding[] = [];
        for (const row of page.page) {
            if (args.organizationId && row.organizationId !== args.organizationId) {
                continue;
            }
            const finding = await inspectRow(ctx, args.table, row);
            if (!finding) {
                continue;
            }
            if (args.repair) {
                if (finding.action === 'delete') {
                    await ctx.db.delete(args.table, row._id);
                } else if (finding.action === 'clear_category' && args.table === 'objectives') {
                    const id = ctx.db.normalizeId('objectives', row._id);
                    if (id) {
                        await ctx.db.patch('objectives', id, { categoryId: undefined });
                    }
                } else if (finding.action === 'clear_creator' && args.table === 'categories') {
                    const id = ctx.db.normalizeId('categories', row._id);
                    if (id) {
                        await ctx.db.patch('categories', id, { userId: undefined });
                    }
                }
            }
            findings.push({ ...finding, repaired: args.repair ?? false });
        }
        return { findings, continueCursor: page.continueCursor, isDone: page.isDone };
    },
});
