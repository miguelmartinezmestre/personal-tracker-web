'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@/convex/_generated/api';
import CreateCategoryFormModal from './category-form-create-modal';
import CategoriesTable from './categories-table';

interface CategoriesLayoutProps {
    preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;
}

export default function CategoriesLayout({ preloadedCategoriesQuery }: CategoriesLayoutProps) {
    const t = useTranslations('Objectives.categories');
    const categories = usePreloadedAuthQuery(preloadedCategoriesQuery);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 text-2xl font-bold">{t('title')}</h1>
                <div className="w-full sm:w-auto">
                    <CreateCategoryFormModal />
                </div>
            </div>
            <CategoriesTable initialCategories={categories ?? undefined} />
        </div>
    );
}
