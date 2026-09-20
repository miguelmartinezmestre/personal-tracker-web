'use client';

import { DataTable } from '@/components/data-table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { categoryIconSchema, type Category } from '@/features/categories/schemas/category';
import type { FunctionReturnType } from 'convex/server';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { useCategoriesTableColumns } from './categories-table-columns';
import { DEFAULT_PAGE_SIZE } from '@shared/pagination';

type ConvexCategory = FunctionReturnType<typeof api.categories.getCategoriesByUser>['page'][number];

function mapConvexCategoryToCategory(convexCategory: ConvexCategory): Category {
    const validIcon = categoryIconSchema.safeParse(convexCategory.icon).data;

    return {
        id: convexCategory._id,
        capabilities: convexCategory.capabilities,
        name: convexCategory.name,
        color: convexCategory.color,
        icon: validIcon,
    };
}

export default function CategoriesTable() {
    const columns = useCategoriesTableColumns();

    const pagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { paginationOpts, nextPage, previousPage, hasPreviousPage } = pagination;

    const categoriesQuery = useQuery(
        convexQuery(api.categories.getCategoriesByUser, { paginationOpts })
    );

    const continueCursor = categoriesQuery.data?.continueCursor ?? null;
    const pageIsDone = categoriesQuery.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const tableCategories = (categoriesQuery.data?.page ?? []).map(mapConvexCategoryToCategory);

    return (
        <div>
            <DataTable
                isError={categoriesQuery.isError}
                error={categoriesQuery.error}
                onRetry={() => {
                    void categoriesQuery.refetch();
                }}
                columns={columns}
                data={tableCategories}
                isLoading={categoriesQuery.isLoading}
                pagination={{
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: categoriesQuery.isFetching,
                }}
            />
        </div>
    );
}
