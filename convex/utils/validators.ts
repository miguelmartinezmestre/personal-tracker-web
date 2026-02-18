import { v } from 'convex/values';
import {
    OBJECTIVE_STATUS,
    OBJECTIVE_TYPE,
    PERIOD,
    NOTIFICATION_TYPE,
    DIRECTION,
    REMINDER_INTERVAL,
    PROGRESS_MODE,
    ACHIEVEMENT_TYPE,
    ACHIEVEMENT_CATEGORY,
    ACHIEVEMENT_TIER,
} from './constants';

export const objectiveStatusValidator = v.union(
    v.literal(OBJECTIVE_STATUS.ACTIVE),
    v.literal(OBJECTIVE_STATUS.COMPLETED),
    v.literal(OBJECTIVE_STATUS.PAUSED),
    v.literal(OBJECTIVE_STATUS.ARCHIVED),
    v.literal(OBJECTIVE_STATUS.DELETED)
);

export const objectiveTypeValidator = v.optional(
    v.union(
        v.literal(OBJECTIVE_TYPE.VALUE),
        v.literal(OBJECTIVE_TYPE.COUNT),
        v.literal(OBJECTIVE_TYPE.MONEY),
        v.literal(OBJECTIVE_TYPE.DURATION)
    )
);

export const periodValidator = v.optional(
    v.union(
        v.literal(PERIOD.NONE),
        v.literal(PERIOD.WEEKLY),
        v.literal(PERIOD.MONTHLY),
        v.literal(PERIOD.CUSTOM)
    )
);

export const notificationTypeValidator = v.union(
    v.literal(NOTIFICATION_TYPE.DEADLINE),
    v.literal(NOTIFICATION_TYPE.PROGRESS),
    v.literal(NOTIFICATION_TYPE.STATUS),
    v.literal(NOTIFICATION_TYPE.ACHIEVEMENT),
    v.literal('reminder')
);

export const directionValidator = v.optional(
    v.union(v.literal(DIRECTION.INCREASE), v.literal(DIRECTION.DECREASE))
);

export const reminderIntervalValidator = v.optional(
    v.union(
        v.literal(REMINDER_INTERVAL.NONE),
        v.literal(REMINDER_INTERVAL.MONTHLY),
        v.literal(REMINDER_INTERVAL.BIWEEKLY)
    )
);

export const progressModeValidator = v.optional(
    v.union(v.literal(PROGRESS_MODE.CUMULATIVE), v.literal(PROGRESS_MODE.SNAPSHOT))
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
