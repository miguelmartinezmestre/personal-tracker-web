import { internal } from '../../_generated/api';
import type { MutationCtx } from '../../_generated/server';
import { findCategoryIdByName } from '../../domain/objectives/categoryResolution';

const BATCH_SIZE = 100;

export async function backfillObjectiveCategoryIdsJob(ctx: MutationCtx, args: { cursor?: string }) {
    const page = await ctx.db.query('objectives').paginate({
        numItems: BATCH_SIZE,
        cursor: args.cursor ?? null,
    });

    for (const objective of page.page) {
        if (objective.categoryId || !objective.category?.trim()) continue;
        const categoryId = await findCategoryIdByName(
            ctx,
            objective.organizationId,
            objective.category
        );
        if (categoryId) {
            await ctx.db.patch(objective._id, { categoryId });
        }
    }

    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.objectives.backfillObjectiveCategoryIds, {
            cursor: page.continueCursor,
        });
    }
}
