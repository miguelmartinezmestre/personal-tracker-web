import type { MutationCtx } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';

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
