import type { SetupCategory } from '../schemas/setup-schema';

export const DEFAULT_CATEGORIES: SetupCategory[] = [
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
