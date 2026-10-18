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
