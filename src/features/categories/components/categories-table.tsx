'use client';

import { DataTable } from '@/components/data-table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Category } from '@/features/categories/schemas/category';
import type { Id } from '@/convex/_generated/dataModel';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { useCategoriesTableColumns } from './categories-table-columns';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

type ConvexCategory = {
    _id: Id<'categories'>;
    _creationTime: number;
    name: string;
    color: string;
    icon?: string;
    userId: string;
    organizationId: string;
    createdAt: number;
    updatedAt: number;
};

function mapConvexCategoryToCategory(convexCategory: ConvexCategory): Category {
    const validIcon: Category['icon'] =
        convexCategory.icon === 'target' ||
        convexCategory.icon === 'chart' ||
        convexCategory.icon === 'check' ||
        convexCategory.icon === 'calendar' ||
        convexCategory.icon === 'lightbulb' ||
        convexCategory.icon === 'users'
            ? convexCategory.icon
            : undefined;

    return {
        id: convexCategory._id,
        name: convexCategory.name,
        color: convexCategory.color,
        icon: validIcon,
    };
}

export default function CategoriesTable() {
    const columns = useCategoriesTableColumns();

    const pagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } = pagination;

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
                columns={columns}
                data={tableCategories}
                isLoading={categoriesQuery.isLoading}
                pagination={{
                    currentPage,
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
