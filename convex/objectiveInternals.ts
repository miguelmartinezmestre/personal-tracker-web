/**
 * Objective Internal Functions
 *
 * These internal functions are used by the objective lifecycle workflow.
 * They are not exposed to the public API and bypass RLS for workflow operations.
 */

import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { Doc } from './_generated/dataModel';

/**
 * Get objective by ID without RLS (for internal workflow use)
 */
export const getByIdInternal = internalQuery({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args): Promise<Doc<'objectives'> | null> => {
        return await ctx.db.get(args.objectiveId);
    },
});
