import { v } from 'convex/values';

export const achievementValidator = v.object({
    code: v.string(),
    scope: v.union(v.literal('individual'), v.literal('organization')),
    category: v.union(
        v.literal('milestone'),
        v.literal('completion'),
        v.literal('streak'),
        v.literal('activity')
    ),
    tier: v.union(v.literal('bronze'), v.literal('silver'), v.literal('gold')),
    threshold: v.number(),
    points: v.number(),
    // Worked out on every read and capped at the threshold (INH-LOG-05).
    progress: v.number(),
    earnedAt: v.union(v.number(), v.null()),
});
