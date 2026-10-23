import type { Doc } from '../../_generated/dataModel';
import { rlsDeny, rlsWhen, type RlsHelpers } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

// Awarded only by internal functions; each user reads their own and their organization's.
export function achievementTableRules({ userId, isActiveOrganization }: RlsHelpers) {
    return {
        obtainedAchievements: {
            read: (_ctx: QueryLike, achievement: Doc<'obtainedAchievements'>) =>
                rlsWhen(achievement.userId === userId),
            insert: rlsDeny,
            modify: rlsDeny,
        },
        organizationAchievements: {
            read: (_ctx: QueryLike, achievement: Doc<'organizationAchievements'>) =>
                rlsWhen(isActiveOrganization(achievement.organizationId)),
            insert: rlsDeny,
            modify: rlsDeny,
        },
    };
}
