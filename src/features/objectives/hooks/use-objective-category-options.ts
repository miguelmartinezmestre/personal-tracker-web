'use client';

import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import type { CategoryOption } from '@/features/objectives/lib/objective-category-selection';

export function useObjectiveCategoryOptions() {
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

    const categoryNameById = new Map(options.map(option => [option.id, option.label]));

    return {
        categoriesQuery,
        categoryOptions: options,
        categoryNameById,
    };
}
