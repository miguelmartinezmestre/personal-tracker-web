'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import {
    type CategoryOption,
    decodeMissingCategorySelection,
    encodeMissingCategorySelection,
    isMissingCategorySelection,
} from '@/features/objectives/lib/objective-category-selection';

type UseObjectiveCategoryOptionsArgs = {
    selectedCategoryId?: string | null;
    fallbackCategoryName?: string | null;
};

export function useObjectiveCategoryOptions({
    selectedCategoryId,
    fallbackCategoryName,
}: UseObjectiveCategoryOptionsArgs = {}) {
    const categoriesQuery = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 100, cursor: null },
        }),
    });

    const options: CategoryOption[] = (categoriesQuery.data?.page ?? []).map(
        (category: Doc<'categories'>) => ({
            id: category._id,
            label: category.name,
        })
    );

    if (fallbackCategoryName) {
        const hasSelectedCategory =
            selectedCategoryId && options.some(option => option.id === selectedCategoryId);
        const hasFallbackLabel = options.some(option => option.label === fallbackCategoryName);

        if (selectedCategoryId && !isMissingCategorySelection(selectedCategoryId)) {
            if (!hasSelectedCategory) {
                options.unshift({
                    id: selectedCategoryId,
                    label: fallbackCategoryName,
                });
            }
        } else if (!hasFallbackLabel) {
            options.unshift({
                id: encodeMissingCategorySelection(fallbackCategoryName),
                label: fallbackCategoryName,
            });
        }
    }

    const getCategoryNameForSelection = (selection: string | null | undefined) => {
        if (!selection) {
            return undefined;
        }
        if (isMissingCategorySelection(selection)) {
            return decodeMissingCategorySelection(selection);
        }

        return options.find(option => option.id === selection)?.label;
    };

    return {
        categoriesQuery,
        categoryOptions: options,
        getCategoryNameForSelection,
    };
}
