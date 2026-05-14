'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { useConvexAuth, usePreloadedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FunctionReturnType } from 'convex/server';
import CreateCategoryFormModal from './category-form-create-modal';
import CategoriesTable from './categories-table';

type CategoriesResult = FunctionReturnType<typeof api.categories.getCategoriesByUser>;

interface CategoriesLayoutProps {
    preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;
}

import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesLayout({ preloadedCategoriesQuery }: CategoriesLayoutProps) {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

    if (authLoading || !isAuthenticated) {
        return (
            <div className="w-full min-w-0 space-y-6">
                <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return <CategoriesContent preloadedCategoriesQuery={preloadedCategoriesQuery} />;
}

function CategoriesContent({ preloadedCategoriesQuery }: CategoriesLayoutProps) {
    const t = useTranslations('Objectives.categories');
    const categories = usePreloadedQuery(preloadedCategoriesQuery);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 text-2xl font-bold">{t('title')}</h1>
                <div className="w-full sm:w-auto">
                    <CreateCategoryFormModal />
                </div>
            </div>
            <CategoriesTable initialCategories={(categories as CategoriesResult) ?? undefined} />
        </div>
    );
}
