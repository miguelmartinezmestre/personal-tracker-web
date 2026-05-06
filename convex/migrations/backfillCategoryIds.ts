import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { findCategoryIdByName } from '../utils/categoryResolution';

export const backfillCategoryIds = internalMutation({
    args: {
        cursor: v.optional(v.string()),
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const BATCH = args.batchSize ?? 100;

        const page = await ctx.db.query('objectives').paginate({
            numItems: BATCH,
            cursor: args.cursor ?? null,
        });

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const objective of page.page) {
            if (objective.categoryId || !objective.category?.trim()) {
                skipped++;
                continue;
            }

            try {
                const categoryId = await findCategoryIdByName(
                    ctx,
                    objective.organizationId,
                    objective.category
                );

                if (categoryId) {
                    await ctx.db.patch(objective._id, { categoryId });
                    updated++;
                } else {
                    skipped++;
                }
            } catch (error) {
                failed++;
                console.error(
                    `Failed to backfill categoryId for objective ${objective._id}:`,
                    error
                );
            }
        }

        if (!page.isDone) {
            await ctx.scheduler.runAfter(
                0,
                internal.migrations.backfillCategoryIds.backfillCategoryIds,
                {
                    cursor: page.continueCursor,
                    batchSize: BATCH,
                }
            );
        }

        return {
            status: page.isDone ? 'completed' : 'in_progress',
            updated,
            skipped,
            failed,
            totalProcessed: page.page.length,
            nextCursor: page.isDone ? null : page.continueCursor,
        };
    },
});

export const getBackfillStats = internalMutation({
    args: {},
    handler: async ctx => {
        const allObjectives = await ctx.db.query('objectives').collect();

        const withCategoryId = allObjectives.filter(o => o.categoryId).length;
        const withCategoryStringOnly = allObjectives.filter(
            o => o.category && !o.categoryId
        ).length;
        const withNeither = allObjectives.filter(o => !o.category && !o.categoryId).length;
        const total = allObjectives.length;

        return {
            total,
            withCategoryId,
            withCategoryStringOnly,
            withNeither,
            percentMigrated: total > 0 ? Math.round((withCategoryId / total) * 100) : 0,
        };
    },
});

declare const internal: typeof import('../_generated/api').internal;
