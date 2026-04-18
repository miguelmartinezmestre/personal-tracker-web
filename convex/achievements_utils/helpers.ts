import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id, Doc } from '../_generated/dataModel';

/**
 * Add a contributor to an organization achievement
 * Prevents duplicates and maintains the contributor count
 */
export async function addContributor(
    ctx: MutationCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    userId: Id<'user'>,
    contributionValue?: number
): Promise<void> {
    // Check if contributor already exists
    const existing = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement_user', q =>
            q.eq('organizationAchievementId', orgAchievementId).eq('userId', userId)
        )
        .first();

    if (existing) return; // Already contributed, don't add again

    // Create contributor record
    await ctx.db.insert('organizationAchievementContributors', {
        organizationAchievementId: orgAchievementId,
        userId,
        contributedAt: Date.now(),
        contributionValue: contributionValue ?? 1,
    });

    // Increment counter in organizationAchievements
    const orgAch = await ctx.db.get('organizationAchievements', orgAchievementId);
    if (orgAch) {
        await ctx.db.patch('organizationAchievements', orgAchievementId, {
            contributorCount: (orgAch.contributorCount ?? 0) + 1,
        });
    }
}

/**
 * Get contributors for an organization achievement
 * Returns users with optional limit
 */
export async function getContributors(
    ctx: QueryCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    maxResults: number = 100
): Promise<Doc<'user'>[]> {
    const contributions = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement', q =>
            q.eq('organizationAchievementId', orgAchievementId)
        )
        .take(maxResults);

    const users = await Promise.all(contributions.map(c => ctx.db.get('user', c.userId)));

    return users.filter((u): u is Doc<'user'> => u !== null);
}

/**
 * Check if a user is a contributor to an organization achievement
 */
export async function isContributor(
    ctx: QueryCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    userId: Id<'user'>
): Promise<boolean> {
    const existing = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement_user', q =>
            q.eq('organizationAchievementId', orgAchievementId).eq('userId', userId)
        )
        .first();

    return existing !== null;
}

/**
 * Remove a contributor from an organization achievement
 * Also updates the counter
 */
export async function removeContributor(
    ctx: MutationCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    userId: Id<'user'>
): Promise<void> {
    const existing = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement_user', q =>
            q.eq('organizationAchievementId', orgAchievementId).eq('userId', userId)
        )
        .first();

    if (!existing) return; // Not a contributor, nothing to do

    // Delete contributor record
    await ctx.db.delete(existing._id);

    // Decrement counter in organizationAchievements
    const orgAch = await ctx.db.get('organizationAchievements', orgAchievementId);
    if (orgAch && orgAch.contributorCount > 0) {
        await ctx.db.patch('organizationAchievements', orgAchievementId, {
            contributorCount: orgAch.contributorCount - 1,
        });
    }
}

/**
 * Get contributor count for an organization achievement
 * Uses the denormalized counter (faster) or counts from table (slower but accurate)
 */
export async function getContributorCount(
    ctx: QueryCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    useAccurateCount: boolean = false
): Promise<number> {
    if (!useAccurateCount) {
        const orgAch = await ctx.db.get('organizationAchievements', orgAchievementId);
        return orgAch?.contributorCount ?? 0;
    }

    // Accurate count from table (capped at 1000 for performance)
    const contributions = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement', q =>
            q.eq('organizationAchievementId', orgAchievementId)
        )
        .take(1000);

    return contributions.length;
}
