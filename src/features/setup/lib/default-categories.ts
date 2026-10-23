import type { CategoryDraft } from '@/features/categories/schemas/category';

// The catalog the setup proposes; each name comes from `Categories.defaults` in the default language.
export const CATEGORY_PROPOSAL = [
    { key: 'Health', color: '#EF4444', icon: 'heart' },
    { key: 'Career', color: '#3B82F6', icon: 'briefcase' },
    { key: 'Education', color: '#8B5CF6', icon: 'book' },
    { key: 'Finance', color: '#10B981', icon: 'dollar-sign' },
    { key: 'Personal', color: '#F59E0B', icon: 'user' },
    { key: 'Team', color: '#06B6D4', icon: 'users' },
    { key: 'Creative', color: '#EC4899', icon: 'palette' },
    { key: 'Fitness', color: '#14B8A6', icon: 'target' },
    { key: 'Productivity', color: '#6366F1', icon: 'trending-up' },
] as const satisfies ReadonlyArray<{ key: string } & Omit<CategoryDraft, 'name'>>;
