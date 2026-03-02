import { v } from 'convex/values';
import {
    OBJECTIVE_STATUS,
    OBJECTIVE_SCOPE,
    NOTIFICATION_TYPE,
    ACHIEVEMENT_TYPE,
    ACHIEVEMENT_CATEGORY,
    ACHIEVEMENT_TIER,
} from './constants';

export const objectiveStatusValidator = v.union(
    v.literal(OBJECTIVE_STATUS.ACTIVE),
    v.literal(OBJECTIVE_STATUS.COMPLETED)
);

export const objectiveScopeValidator = v.union(
    v.literal(OBJECTIVE_SCOPE.PERSONAL),
    v.literal(OBJECTIVE_SCOPE.ORGANIZATION)
);

export const notificationTypeValidator = v.union(
    v.literal(NOTIFICATION_TYPE.DEADLINE),
    v.literal(NOTIFICATION_TYPE.PROGRESS),
    v.literal(NOTIFICATION_TYPE.STATUS),
    v.literal(NOTIFICATION_TYPE.ACHIEVEMENT),
    v.literal('reminder')
);

export const achievementTypeValidator = v.union(
    v.literal(ACHIEVEMENT_TYPE.INDIVIDUAL),
    v.literal(ACHIEVEMENT_TYPE.ORGANIZATION)
);

export const achievementCategoryValidator = v.union(
    v.literal(ACHIEVEMENT_CATEGORY.MILESTONE),
    v.literal(ACHIEVEMENT_CATEGORY.STREAK),
    v.literal(ACHIEVEMENT_CATEGORY.COMPLETION),
    v.literal(ACHIEVEMENT_CATEGORY.ACTIVITY)
);

export const achievementTierValidator = v.union(
    v.literal(ACHIEVEMENT_TIER.BRONZE),
    v.literal(ACHIEVEMENT_TIER.SILVER),
    v.literal(ACHIEVEMENT_TIER.GOLD),
    v.literal(ACHIEVEMENT_TIER.PLATINUM)
);
