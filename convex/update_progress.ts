import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import {
    createProgressUpdate,
    deleteProgressUpdate,
    getProgressSeriesByObjective,
    listProgressUpdatesByObjective,
    updateProgressUpdate,
} from './domain/objectives/progress';

export const createUpdateProgress = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await createProgressUpdate(ctx, args);
    },
});

export const getUpdateProgressByObjectiveId = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await listProgressUpdatesByObjective(ctx, args);
    },
});

export const getProgressSeriesByObjectiveId = queryWithRLS({
    args: {
        objectiveId: v.id('objectives'),
    },
    returns: v.object({
        points: v.array(
            v.object({
                objective: v.id('objectives'),
                userId: v.id('user'),
                organizationId: v.id('organization'),
                updatedValue: v.number(),
                updateDate: v.number(),
                comment: v.optional(v.string()),
                createdAt: v.number(),
                updatedAt: v.number(),
                _id: v.id('progressUpdates'),
                _creationTime: v.number(),
            })
        ),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        return await getProgressSeriesByObjective(ctx, args);
    },
});

export const updateUpdateProgress = mutationWithRLS({
    args: {
        id: v.id('progressUpdates'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await updateProgressUpdate(ctx, args);
    },
});

export const deleteUpdateProgress = mutationWithRLS({
    args: {
        _id: v.id('progressUpdates'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        return await deleteProgressUpdate(ctx, { id: args._id });
    },
});
