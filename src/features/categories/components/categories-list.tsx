'use client';

import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/data-table/components/delete-confirmation-dialog';
import { CategoryFormModal } from '@/features/categories/components/category-form-modal';
import { categoryIconComponent } from '@/features/categories/lib/category-icons';
import { toCategoryDraft, type CategoryDraft } from '@/features/categories/schemas/category';

type ListedCategory<TId extends string> = {
    id: TId;
    name: string;
    color: string;
    icon?: string;
    canManage: boolean;
};

/** Categories with their color and icon, and edit and delete for those the user may change. */
export function CategoriesList<TId extends string>({
    categories,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting,
}: {
    categories: ListedCategory<TId>[];
    onUpdate: (id: TId, values: CategoryDraft) => Promise<void>;
    onDelete: (id: TId) => Promise<void>;
    isUpdating: boolean;
    isDeleting: boolean;
}) {
    const t = useTranslations('Categories');

    return (
        <ul className="divide-y rounded-md border" data-testid="categories-list">
            {categories.map(category => {
                const Icon = categoryIconComponent(category.icon);

                return (
                    <li
                        key={category.id}
                        className="flex items-center gap-3 px-3 py-2"
                        data-testid="category-row"
                    >
                        <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                            style={{ backgroundColor: category.color }}
                        >
                            <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                        {category.canManage && (
                            <>
                                <CategoryFormModal
                                    title={t('form.editTitle')}
                                    defaultValues={toCategoryDraft(category)}
                                    isPending={isUpdating}
                                    onSubmit={async values => {
                                        await onUpdate(category.id, values);
                                        toast.success(t('toast.updated'));
                                    }}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('edit', { name: category.name })}
                                            data-testid="category-edit-button"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                    }
                                />
                                <DeleteConfirmationDialog
                                    title={t('delete.title')}
                                    description={t('delete.description', { name: category.name })}
                                    confirmLabel={t('delete.confirm')}
                                    cancelLabel={t('form.cancel')}
                                    isLoading={isDeleting}
                                    onConfirm={async () => {
                                        try {
                                            await onDelete(category.id);
                                            toast.success(t('toast.deleted'));
                                        } catch {
                                            // The mutation cache already reports why it failed.
                                        }
                                    }}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('deleteLabel', { name: category.name })}
                                            data-testid="category-delete-button"
                                        >
                                            <Trash2 className="text-destructive size-4" />
                                        </Button>
                                    }
                                />
                            </>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
