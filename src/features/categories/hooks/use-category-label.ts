'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_CATEGORIES } from '@/convex/constants';

const DEFAULT_CATEGORY_NAMES = new Set(DEFAULT_CATEGORIES.map(category => category.name));

/**
 * Default categories are stored with their English names; show them in the user's language.
 * Names people typed themselves are shown as they are.
 */
export function useCategoryLabel() {
    const t = useTranslations('Categories.defaults');
    return useCallback((name: string) => (DEFAULT_CATEGORY_NAMES.has(name) ? t(name) : name), [t]);
}
