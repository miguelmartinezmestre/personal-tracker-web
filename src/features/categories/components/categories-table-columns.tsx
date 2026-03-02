'use client';

import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/features/table/components/delete-confirmation-dialog';
import EditCategoryFormModal from '@/features/categories/components/category-form-edit-modal';
import type { Category } from '@/features/categories/schemas/category';
import * as LucideIcons from 'lucide-react';
import { useDeleteCategory } from './categories-table-actions';

export function useCategoriesTableColumns() {
    const t = useTranslations('Objectives.categories');
    const { deleteCategoryAsync, isDeletingCategory } = useDeleteCategory();

    const renderIcon = (iconName: string | undefined) => {
        if (!iconName) return null;
        const icons = LucideIcons as unknown as Record<
            string,
            React.ComponentType<{ className?: string }>
        >;
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
                            await deleteCategoryAsync({ id: categoryRow.id });
                        }}
                        title={t('confirmDelete')}
                        description={t('confirmDeleteDescription')}
                        triggerLabel={t('buttons.delete')}
                        confirmLabel={t('buttons.confirm')}
                        cancelLabel={t('buttons.cancel')}
                        isLoading={isDeletingCategory}
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

    return columns;
}
