import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation } from '../_generated/server';
import { findCategoryIdByName } from '../domain/objectives/categoryResolution';

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
        let total = 0;
        let withCategoryId = 0;
        let withCategoryStringOnly = 0;
        let withNeither = 0;
        let cursor: string | null = null;
        let isDone = false;

        while (!isDone) {
            const page = await ctx.db.query('objectives').paginate({
                numItems: 500,
                cursor,
            });

            for (const o of page.page) {
                total++;
                if (o.categoryId) {
                    withCategoryId++;
                } else if (o.category) {
                    withCategoryStringOnly++;
                } else {
                    withNeither++;
                }
            }

            isDone = page.isDone;
            cursor = page.continueCursor;
        }

        return {
            total,
            withCategoryId,
            withCategoryStringOnly,
            withNeither,
            percentMigrated: total > 0 ? Math.round((withCategoryId / total) * 100) : 0,
        };
    },
});
