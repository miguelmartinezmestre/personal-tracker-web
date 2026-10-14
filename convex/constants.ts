export const TIME = {
    DAY_MS: 24 * 60 * 60 * 1000,
    FIVE_YEARS_MS: 5 * 365 * 24 * 60 * 60 * 1000,
} as const;

export const ERROR_CODES = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    FORBIDDEN: 'FORBIDDEN',
    REGISTRATION_INVITATION_REQUIRED: 'REGISTRATION_INVITATION_REQUIRED',
    SETUP_SECRET_REQUIRED: 'SETUP_SECRET_REQUIRED',

    NO_ACTIVE_ORG: 'NO_ACTIVE_ORG',
    ORG_NOT_FOUND: 'ORG_NOT_FOUND',
    PERSONAL_ORG_DELETE_FORBIDDEN: 'PERSONAL_ORG_DELETE_FORBIDDEN',
    PERSONAL_ORG_UPDATE_RESTRICTED: 'PERSONAL_ORG_UPDATE_RESTRICTED',
    PERSONAL_ORG_INVITE_FORBIDDEN: 'PERSONAL_ORG_INVITE_FORBIDDEN',
    PERSONAL_ORG_MEMBER_ADD_FORBIDDEN: 'PERSONAL_ORG_MEMBER_ADD_FORBIDDEN',

    USER_NOT_FOUND: 'USER_NOT_FOUND',
    PLATFORM_ALREADY_CONFIGURED: 'PLATFORM_ALREADY_CONFIGURED',
    SETUP_USER_MISMATCH: 'SETUP_USER_MISMATCH',
    SETUP_USER_DELETE_FORBIDDEN: 'SETUP_USER_DELETE_FORBIDDEN',
    SETUP_AUTH_REQUIRED: 'SETUP_AUTH_REQUIRED',

    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',

    FUTURE_DATE_NOT_ALLOWED: 'FUTURE_DATE_NOT_ALLOWED',

    OBJECTIVE_NOT_FOUND: 'OBJECTIVE_NOT_FOUND',
    PROGRESS_NOT_FOUND: 'PROGRESS_NOT_FOUND',
    CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
    NOT_AUTHORIZED_OBJECTIVE: 'NOT_AUTHORIZED_OBJECTIVE',
    NOT_AUTHORIZED_PROGRESS: 'NOT_AUTHORIZED_PROGRESS',
    OBJECTIVE_ALREADY_COMPLETED: 'OBJECTIVE_ALREADY_COMPLETED',
    TARGET_NOT_FINITE: 'TARGET_NOT_FINITE',
    TARGET_TOO_SMALL: 'TARGET_TOO_SMALL',
    VALUE_NOT_FINITE: 'VALUE_NOT_FINITE',
    VALUE_NEGATIVE: 'VALUE_NEGATIVE',
    PROGRESS_NOT_POSITIVE: 'PROGRESS_NOT_POSITIVE',
    VALUE_TOO_LARGE: 'VALUE_TOO_LARGE',
    DEADLINE_TOO_OLD: 'DEADLINE_TOO_OLD',
    START_AFTER_TARGET: 'START_AFTER_TARGET',
    ORGANIZATION_NAME_TAKEN: 'ORGANIZATION_NAME_TAKEN',
} as const;

export const CATEGORY_NAME_MAX_LENGTH = 50;
export const OBJECTIVE_TITLE_MAX_LENGTH = 120;
export const OBJECTIVE_DESCRIPTION_MAX_LENGTH = 2000;
export const OBJECTIVE_UNIT_MAX_LENGTH = 32;
export const PROGRESS_COMMENT_MAX_LENGTH = 500;
export const CATEGORY_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const CATEGORY_ICONS = [
    'tag',
    'heart',
    'briefcase',
    'book',
    'user',
    'dollar-sign',
    'users',
    'palette',
    'home',
    'map',
    'target',
    'chart',
    'check',
    'calendar',
    'lightbulb',
    'trending-up',
    'star',
    'award',
    'zap',
    'coffee',
    'music',
    'camera',
    'plane',
] as const;

// Seeded into every new organization; the setup wizard starts from the same list.
export const DEFAULT_CATEGORIES: ReadonlyArray<{
    name: string;
    color: string;
    icon: (typeof CATEGORY_ICONS)[number];
}> = [
    { name: 'Health', color: '#EF4444', icon: 'heart' },
    { name: 'Career', color: '#3B82F6', icon: 'briefcase' },
    { name: 'Education', color: '#8B5CF6', icon: 'book' },
    { name: 'Finance', color: '#10B981', icon: 'dollar-sign' },
    { name: 'Personal', color: '#F59E0B', icon: 'user' },
    { name: 'Team', color: '#06B6D4', icon: 'users' },
    { name: 'Creative', color: '#EC4899', icon: 'palette' },
    { name: 'Fitness', color: '#14B8A6', icon: 'target' },
    { name: 'Productivity', color: '#6366F1', icon: 'trending-up' },
];
