'use client';

import { useEffect } from 'react';
import { DataTable } from '@/features/table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import type { Category } from '@/features/categories/schemas/category';
import type { Id } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { useServerPagination } from '@/features/table/hooks/use-server-pagination';
import { useCategoriesTableColumns } from './categories-table-columns';

const DEFAULT_PAGE_SIZE = 20;

// Tipo que viene de Convex
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

// Función para mapear de Convex a Category
function mapConvexCategoryToCategory(convexCategory: ConvexCategory): Category {
    return {
        id: convexCategory._id,
        name: convexCategory.name,
        color: convexCategory.color,
        icon: convexCategory.icon as Category['icon'],
    };
}

type CategoriesResult = FunctionReturnType<typeof api.categories.getCategoriesByUser>;

interface CategoriesTableProps {
    initialCategories: CategoriesResult | undefined;
}

export default function CategoriesTable({ initialCategories }: CategoriesTableProps) {
    const columns = useCategoriesTableColumns();

    const {
        currentPage,
        isDone,
        getPaginationOpts,
        updateCursor,
        goToPage,
        hasNextPage,
        hasPreviousPage,
    } = useServerPagination(DEFAULT_PAGE_SIZE);

    const paginationOpts = getPaginationOpts(currentPage);
    const isFirstPage = paginationOpts.cursor === null;

    const categories = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, { paginationOpts }),
        initialData: isFirstPage ? initialCategories : undefined,
    });

    const hasData = categories.data !== undefined;
    const continueCursor = categories.data?.continueCursor ?? null;
    const pageIsDone = categories.data?.isDone ?? false;

    useEffect(() => {
        if (!hasData || categories.isFetching) return;
        updateCursor(currentPage, continueCursor, pageIsDone);
    }, [currentPage, hasData, continueCursor, pageIsDone, categories.isFetching, updateCursor]);

    const mappedData = (categories.data?.page ?? []).map(mapConvexCategoryToCategory);
    const totalPages = isDone ? currentPage + 1 : currentPage + 2;

    return (
        <div>
            <DataTable
                columns={columns}
                data={mappedData}
                isLoading={categories.isLoading}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: goToPage,
                    hasNextPage,
                    hasPreviousPage,
                    pageSize: DEFAULT_PAGE_SIZE,
                }}
            />
        </div>
    );
}
