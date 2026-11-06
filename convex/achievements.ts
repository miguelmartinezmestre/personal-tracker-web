import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { queryWithRLS } from './features/authorization/wrappers';
import { ACHIEVEMENTS } from './features/achievements/definitions';
import { achievementMetrics } from './features/achievements/metrics';
import { isNotificationEnabled } from './features/notifications/delivery';
import { achievementNotice } from './features/notifications/notices';
import { requireOrganizationId } from './features/objectives/records';
import { achievementValidator } from './features/achievements/validators';
import { getOrganization, getUser } from './features/auth/authRecords';

export const getAchievements = queryWithRLS({
    args: {},
    returns: v.object({
        userPoints: v.number(),
        organizationPoints: v.number(),
        achievements: v.array(achievementValidator),
    }),
    handler: async ctx => {
        const organizationId = requireOrganizationId(ctx.organizationId);

        const [earned, organizationEarned] = await Promise.all([
            ctx.db
                .query('obtainedAchievements')
                .withIndex('by_user_achievement', q => q.eq('userId', ctx.userId))
                .take(ACHIEVEMENTS.length),
            ctx.db
                .query('organizationAchievements')
                .withIndex('by_organization_achievement', q =>
                    q.eq('organizationId', organizationId)
                )
                .take(ACHIEVEMENTS.length),
        ]);

        // Only counts leave this query, so it may read objectives the user can't open.
        const metrics = await achievementMetrics(
            ctx.dbForIntegrityChecks,
            ctx.userId,
            organizationId,
            false
        );

        const earnedAt = new Map(
            [...earned, ...organizationEarned].map(row => [row.achievement, row.earnedAt])
        );

        const achievements = ACHIEVEMENTS.map(({ metric, ...achievement }) => {
            const at = earnedAt.get(achievement.code) ?? null;

            return {
                ...achievement,
                progress:
                    at === null
                        ? Math.min(metrics[metric], achievement.threshold)
                        : achievement.threshold,
                earnedAt: at,
            };
        });

        const pointsOf = (scope: 'individual' | 'organization') =>
            achievements
                .filter(achievement => achievement.scope === scope && achievement.earnedAt !== null)
                .reduce((total, achievement) => total + achievement.points, 0);

        return {
            userPoints: pointsOf('individual'),
            organizationPoints: pointsOf('organization'),
            achievements,
        };
    },
});

export const evaluateAchievements = internalMutation({
    args: {
        userId: v.id('user'),
        organizationId: v.id('organization'),
        isEarlyBird: v.boolean(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await getUser(ctx, args.userId);

        if (!user || user.deletedAt != null || !(await getOrganization(ctx, args.organizationId))) {
            return null;
        }

        const metrics = await achievementMetrics(
            ctx.db,
            args.userId,
            args.organizationId,
            args.isEarlyBird
        );

        const now = Date.now();

        for (const achievement of ACHIEVEMENTS) {
            if (metrics[achievement.metric] < achievement.threshold) {
                continue;
            }

            if (achievement.scope === 'individual') {
                const earned = await ctx.db
                    .query('obtainedAchievements')
                    .withIndex('by_user_achievement', q =>
                        q.eq('userId', args.userId).eq('achievement', achievement.code)
                    )
                    .unique();

                if (earned) {
                    continue;
                }

                await ctx.db.insert('obtainedAchievements', {
                    userId: args.userId,
                    achievement: achievement.code,
                    earnedAt: now,
                });

                if (await isNotificationEnabled(ctx.db, args.userId, 'achievement')) {
                    await ctx.db.insert('notifications', {
                        ...achievementNotice(achievement),
                        userId: args.userId,
                        organizationId: args.organizationId,
                        read: false,
                        notificationDate: now,
                    });
                }

                continue;
            }

            const earned = await ctx.db
                .query('organizationAchievements')
                .withIndex('by_organization_achievement', q =>
                    q.eq('organizationId', args.organizationId).eq('achievement', achievement.code)
                )
                .unique();

            if (earned) {
                continue;
            }

            await ctx.db.insert('organizationAchievements', {
                organizationId: args.organizationId,
                achievement: achievement.code,
                earnedAt: now,
                contributedBy: args.userId,
            });
            await ctx.scheduler.runAfter(0, internal.notifications.notifyMembers, {
                organizationId: args.organizationId,
                notice: achievementNotice(achievement),
                cursor: null,
            });
        }

        return null;
    },
});
