import type { Id } from '@/convex/_generated/dataModel';

export const CATEGORY_LOADING_VALUE = '__category_loading__';
export const CATEGORY_EMPTY_VALUE = '__category_empty__';
const MISSING_CATEGORY_PREFIX = '__missing_category__:';

type MissingCategorySelection = `${typeof MISSING_CATEGORY_PREFIX}${string}`;

export type CategoryOption = {
    id: string;
    label: string;
};

export function encodeMissingCategorySelection(category: string): MissingCategorySelection {
    return `${MISSING_CATEGORY_PREFIX}${encodeURIComponent(category)}`;
}

export function isMissingCategorySelection(
    value: string | null | undefined
): value is MissingCategorySelection {
    return typeof value === 'string' && value.startsWith(MISSING_CATEGORY_PREFIX);
}

export function decodeMissingCategorySelection(value: MissingCategorySelection): string {
    return decodeURIComponent(value.slice(MISSING_CATEGORY_PREFIX.length));
}

export function isCategorySelectPlaceholder(value: string | null | undefined): boolean {
    return value === CATEGORY_LOADING_VALUE || value === CATEGORY_EMPTY_VALUE;
}

export function toCategoryId(value: string | null | undefined): Id<'categories'> | undefined {
    if (!value || isCategorySelectPlaceholder(value) || isMissingCategorySelection(value)) {
        return undefined;
    }

    return value as Id<'categories'>;
}
