'use client';

import { DataTable } from '@/components/data-table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Category } from '@/features/categories/schemas/category';
import type { Id } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { useServerPagination } from '@/components/data-table/hooks/use-server-pagination';
import { useCategoriesTableColumns } from './categories-table-columns';

const DEFAULT_PAGE_SIZE = 20;

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

type CategoriesResult = FunctionReturnType<typeof api.categories.getCategoriesByUser>;

interface CategoriesTableProps {
    initialCategories: CategoriesResult | undefined;
}

export default function CategoriesTable({ initialCategories }: CategoriesTableProps) {
    const columns = useCategoriesTableColumns();

    const pagination = useServerPagination(DEFAULT_PAGE_SIZE);
    const { currentPage, paginationOpts, nextPage, previousPage, hasPreviousPage } = pagination;
    const isFirstPage = paginationOpts.cursor === null;

    const categories = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, { paginationOpts }),
        initialData: isFirstPage ? initialCategories : undefined,
    });

    const continueCursor = categories.data?.continueCursor ?? null;
    const pageIsDone = categories.data?.isDone ?? false;
    const hasNextPage = Boolean(continueCursor) && !pageIsDone;

    const mappedData = (categories.data?.page ?? []).map(mapConvexCategoryToCategory);

    return (
        <div>
            <DataTable
                columns={columns}
                data={mappedData}
                isLoading={categories.isLoading}
                pagination={{
                    currentPage,
                    onNextPage: () => nextPage(continueCursor, pageIsDone),
                    onPreviousPage: previousPage,
                    hasNextPage,
                    hasPreviousPage,
                    isLoading: categories.isFetching,
                }}
            />
        </div>
    );
}
