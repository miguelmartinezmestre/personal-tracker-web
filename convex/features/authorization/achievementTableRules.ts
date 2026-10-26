import type { Doc } from '../../_generated/dataModel';
import { rlsDeny, rlsWhen, type RlsHelpers } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

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
