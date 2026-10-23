'use client';

import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadMorePagination } from '@/components/data-table/components/load-more-pagination';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { CategoriesList } from '@/features/categories/components/categories-list';
import { CategoryFormModal } from '@/features/categories/components/category-form-modal';

const NEW_CATEGORY = { name: '', color: '#6366F1', icon: 'tag' } as const;

/** The active organization's categories: any member adds them (REQ-CATEGORIAS-001). */
export default function CategoriesPage() {
    const t = useTranslations('Categories');
    const categories = usePaginatedList(api.categories.listCategories, {});
    const create = useMutation({ mutationFn: useConvexMutation(api.categories.createCategory) });
    const update = useMutation({ mutationFn: useConvexMutation(api.categories.updateCategory) });
    const remove = useMutation({ mutationFn: useConvexMutation(api.categories.deleteCategory) });

    return (
        <div className="w-full max-w-3xl min-w-0 space-y-6" data-testid="categories-page">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{t('page.title')}</h1>
                    <p className="text-muted-foreground">{t('page.description')}</p>
                </div>
                <CategoryFormModal
                    title={t('form.createTitle')}
                    defaultValues={NEW_CATEGORY}
                    isPending={create.isPending}
                    onSubmit={async category => {
                        await create.mutateAsync({ category });
                        toast.success(t('toast.created'));
                    }}
                    trigger={
                        <Button className="gap-2" data-testid="category-create-open">
                            <Plus className="size-4" />
                            {t('form.createTitle')}
                        </Button>
                    }
                />
            </div>
            {categories.isLoading && <Skeleton className="h-40 w-full" />}
            {!categories.isLoading && categories.data.length === 0 && (
                <p className="text-muted-foreground" data-testid="categories-empty">
                    {t('page.empty')}
                </p>
            )}
            {categories.data.length > 0 && (
                <CategoriesList
                    categories={categories.data}
                    isUpdating={update.isPending}
                    isDeleting={remove.isPending}
                    onUpdate={async (id, category) => {
                        await update.mutateAsync({ id, category });
                    }}
                    onDelete={async id => {
                        await remove.mutateAsync({ id });
                    }}
                />
            )}
            <LoadMorePagination pagination={categories} rowCount={categories.data.length} />
        </div>
    );
}
