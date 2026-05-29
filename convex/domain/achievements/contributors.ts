import type { MutationCtx, QueryCtx } from '../../_generated/server';
import type { Id, Doc } from '../../_generated/dataModel';

export async function addContributor(
    ctx: MutationCtx,
    orgAchievementId: Id<'organizationAchievements'>,
    userId: Id<'user'>,
    contributionValue?: number
): Promise<void> {
    const existing = await ctx.db
        .query('organizationAchievementContributors')
        .withIndex('by_organizationAchievement_user', q =>
            q.eq('organizationAchievementId', orgAchievementId).eq('userId', userId)
        )
        .first();

    if (existing) return;

    await ctx.db.insert('organizationAchievementContributors', {
        organizationAchievementId: orgAchievementId,
        userId,
        contributedAt: Date.now(),
        contributionValue: contributionValue ?? 1,
    });
}

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

    const users = await Promise.all(
        contributions.map(contribution => ctx.db.get('user', contribution.userId))
    );

    return users.filter((user): user is Doc<'user'> => user !== null);
}
