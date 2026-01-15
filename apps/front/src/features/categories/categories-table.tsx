'use client';

import { DataTable } from '@/features/data-table/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui/components/button';
import EditCategoryFormModal from '@/features/categories/category-form-edit-modal';
import { useTranslations } from 'next-intl';
import { DeleteConfirmationDialog } from '@/features/data-table/delete-confirmation-dialog';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import type { Category } from '@/features/categories/category';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

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

export default function CategoriesTable() {
    const t = useTranslations('Objectives.categories');
    const queryClient = useQueryClient();

    const categories = useQuery(convexQuery(api.categories.getCategoriesByUser, {}));

    const deleteCategory = useMutation({
        mutationFn: useConvexMutation(api.categories.deleteCategory),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.categories.getCategoriesByUser, {}).queryKey,
            });
        },
    });

    const renderIcon = (iconName: string | undefined) => {
        if (!iconName) return null;
        const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
        const IconComponent = icons[iconName];
        return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
    };

    const columns: ColumnDef<Category>[] = [
        {
            accessorKey: 'color',
            header: t('fields.color'),
            cell: ({ row }) => {
                const category = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="h-6 w-6 rounded border"
                            style={{ backgroundColor: category.color }}
                            data-testid={`category-color-${category.id}`}
                        />
                    </div>
                );
            },
        },
        {
            accessorKey: 'name',
            header: t('fields.name'),
            cell: ({ row }) => {
                const category = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {renderIcon(category.icon)}
                        <span>{category.name}</span>
                    </div>
                );
            },
        },
        {
            header: '',
            id: 'update-category',
            cell: ({ row }) => {
                const categoryRow = row.original;
                return <EditCategoryFormModal defaultValues={categoryRow} />;
            },
        },
        {
            header: '',
            id: 'delete',
            cell: ({ row }) => {
                const categoryRow = row.original;
                return (
                    <DeleteConfirmationDialog
                        onConfirm={async () => {
                            try {
                                await deleteCategory.mutateAsync({ id: categoryRow.id });
                                toast.success(t('toast.deleteSuccess'));
                            } catch {
                                toast.error(t('toast.deleteFailed'));
                            }
                        }}
                        title={t('confirmDelete')}
                        description={t('confirmDeleteDescription')}
                        triggerLabel={t('buttons.delete')}
                        confirmLabel={t('buttons.confirm')}
                        cancelLabel={t('buttons.cancel')}
                        isLoading={deleteCategory.isPending}
                        trigger={
                            <Button
                                data-testid="category-delete-button"
                                variant="destructive"
                                size="sm"
                            >
                                {t('buttons.delete')}
                            </Button>
                        }
                    />
                );
            },
        },
    ];

    // Mapear los datos de Convex a Category
    const mappedData = (categories.data ?? []).map(mapConvexCategoryToCategory);

    return (
        <div>
            <DataTable columns={columns} data={mappedData} isLoading={categories.isLoading} />
        </div>
    );
}
