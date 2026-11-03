'use client';

import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { CategoriesList } from '@/features/categories/components/categories-list';
import { CategoryFormModal } from '@/features/categories/components/category-form-modal';

const NEW_CATEGORY = { name: '', color: '#6366F1', icon: 'tag' } as const;

export default function AdminCategories() {
    const t = useTranslations('Admin.categories');
    const tCategories = useTranslations('Categories');
    const catalog = useQuery(convexQuery(api.platformCategories.listPlatformCategories, {}));

    const create = useMutation({
        mutationFn: useConvexMutation(api.platformCategories.createPlatformCategory),
    });

    const update = useMutation({
        mutationFn: useConvexMutation(api.platformCategories.updatePlatformCategory),
    });

    const remove = useMutation({
        mutationFn: useConvexMutation(api.platformCategories.deletePlatformCategory),
    });

    let content;

    if (catalog.isError) {
        content = <QueryErrorFallback onRetry={() => void catalog.refetch()} />;
    } else if (!catalog.data) {
        content = <Skeleton className="h-40 w-full" />;
    } else if (catalog.data.length === 0) {
        content = <p className="text-muted-foreground">{t('empty')}</p>;
    } else {
        content = (
            <CategoriesList
                categories={catalog.data.map(category => ({ ...category, canManage: true }))}
                isUpdating={update.isPending}
                isDeleting={remove.isPending}
                onUpdate={async (id, category) => {
                    await update.mutateAsync({ id, category });
                }}
                onDelete={async id => {
                    await remove.mutateAsync({ id });
                }}
            />
        );
    }

    return (
        <section className="space-y-4" data-testid="admin-categories">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">{t('title')}</h2>
                    <p className="text-muted-foreground text-sm">{t('description')}</p>
                </div>
                <CategoryFormModal
                    title={tCategories('form.createTitle')}
                    defaultValues={NEW_CATEGORY}
                    isPending={create.isPending}
                    onSubmit={async category => {
                        await create.mutateAsync({ category });
                        toast.success(tCategories('toast.created'));
                    }}
                    trigger={
                        <Button
                            variant="outline"
                            className="gap-2"
                            data-testid="category-create-open"
                        >
                            <Plus className="size-4" />
                            {tCategories('form.createTitle')}
                        </Button>
                    }
                />
            </div>
            {content}
        </section>
    );
}
