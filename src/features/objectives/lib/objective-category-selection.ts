import type { Id } from '@/convex/_generated/dataModel';

export const CATEGORY_LOADING_VALUE = '__category_loading__';
export const CATEGORY_EMPTY_VALUE = '__category_empty__';

export type CategoryOption = {
    id: string;
    label: string;
};

export function isCategorySelectPlaceholder(value: string | null | undefined): boolean {
    return value === CATEGORY_LOADING_VALUE || value === CATEGORY_EMPTY_VALUE;
}

export function toCategoryId(value: string | null | undefined): Id<'categories'> | undefined {
    if (!value || isCategorySelectPlaceholder(value)) {
        return undefined;
    }

    return value as Id<'categories'>;
}
