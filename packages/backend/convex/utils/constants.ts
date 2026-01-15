/**
 * Time constants in milliseconds
 */
export const TIME = {
    /** Milliseconds in a minute */
    MINUTE_MS: 60 * 1000,
    /** Milliseconds in an hour */
    HOUR_MS: 60 * 60 * 1000,
    /** Milliseconds in a day */
    DAY_MS: 24 * 60 * 60 * 1000,
    /** Milliseconds in a week */
    WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
    /** Default page size for lists */
    DEFAULT_PAGE_SIZE: 10,
    /** Maximum page size allowed */
    MAX_PAGE_SIZE: 100,
    /** Default limit for dashboard items */
    DASHBOARD_LIMIT: 5,
} as const;

/**
 * Dashboard configuration
 */
export const DASHBOARD = {
    /** Number of months to show in monthly progress chart */
    MONTHS_TO_SHOW: 6,
    /** Days to look ahead for upcoming deadlines */
    DEADLINE_DAYS_AHEAD: 7,
    /** Days to look back for recent activity */
    ACTIVITY_DAYS_BACK: 30,
} as const;

/**
 * Objective status values
 */
export const OBJECTIVE_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
} as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUS)[keyof typeof OBJECTIVE_STATUS];

/**
 * Objective types
 */
export const OBJECTIVE_TYPE = {
    VALUE: 'value',
    COUNT: 'count',
    MONEY: 'money',
    DURATION: 'duration',
} as const;

export type ObjectiveType = (typeof OBJECTIVE_TYPE)[keyof typeof OBJECTIVE_TYPE];

/**
 * Objective period types
 */
export const PERIOD = {
    NONE: 'none',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CUSTOM: 'custom',
} as const;

export type Period = (typeof PERIOD)[keyof typeof PERIOD];

/**
 * Notification types
 */
export const NOTIFICATION_TYPE = {
    DEADLINE: 'deadline',
    PROGRESS: 'progress',
    STATUS: 'status',
    ACHIEVEMENT: 'achievement',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/**
 * Achievement types
 */
export const ACHIEVEMENT_TYPE = {
    INDIVIDUAL: 'individual',
    ORGANIZATION: 'organization',
} as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPE)[keyof typeof ACHIEVEMENT_TYPE];

/**
 * Achievement categories
 */
export const ACHIEVEMENT_CATEGORY = {
    MILESTONE: 'milestone',
    STREAK: 'streak',
    COMPLETION: 'completion',
    ACTIVITY: 'activity',
} as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORY)[keyof typeof ACHIEVEMENT_CATEGORY];

/**
 * Achievement tiers
 */
export const ACHIEVEMENT_TIER = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
} as const;

export type AchievementTier = (typeof ACHIEVEMENT_TIER)[keyof typeof ACHIEVEMENT_TIER];

/**
 * User roles
 */
export const USER_ROLE = {
    USER: 'user',
    ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Organization roles
 */
export const ORGANIZATION_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];
