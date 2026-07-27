export const CATEGORY_NAME_MAX_LENGTH = 50;
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

// Keep free-form fields comfortably below Convex's document-size ceiling and
// make direct API clients obey the same contract as the application forms.
export const OBJECTIVE_TITLE_MAX_LENGTH = 200;
export const OBJECTIVE_DESCRIPTION_MAX_LENGTH = 5_000;
export const OBJECTIVE_UNIT_MAX_LENGTH = 50;
export const PROGRESS_COMMENT_MAX_LENGTH = 2_000;
export const USER_NAME_MAX_LENGTH = 100;
export const USER_EMAIL_MAX_LENGTH = 254;
