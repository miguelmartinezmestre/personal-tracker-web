'use client';

import { DataTable } from '@/features/table/components/table';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Category } from '@/features/categories/schemas/category';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { useCategoriesTableColumns } from './categories-table-columns';

// Tipo que viene de Convex
type ConvexCategory = {
    _id: Id<'categories'>;
    _creationTime: number;
    name: string;
    color: string;
    icon?: string;
    user: string;
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
    const categories = useQuery({
        ...convexQuery(api.categories.getCategoriesByUser, {}),
        initialData: initialCategories,
    });

    // Columns
    const columns = useCategoriesTableColumns();

    // Mapear los datos de Convex a Category
    const mappedData = (categories.data ?? []).map(mapConvexCategoryToCategory);

    return (
        <div>
            <DataTable columns={columns} data={mappedData} isLoading={categories.isLoading} />
        </div>
    );
}
