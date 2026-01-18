'use client';

import { useTranslations } from 'next-intl';
import { Preloaded } from 'convex/react';
import { usePreloadedAuthQuery } from '@convex-dev/better-auth/nextjs/client';
import { api } from '@repo/backend/convex/_generated/api';
import CreateCategoryFormModal from './category-form-create-modal';
import CategoriesTable from './categories-table';

interface CategoriesLayoutProps {
    preloadedCategoriesQuery: Preloaded<typeof api.categories.getCategoriesByUser>;
}

export default function CategoriesLayout({ preloadedCategoriesQuery }: CategoriesLayoutProps) {
    const t = useTranslations('Objectives.categories');
    const categories = usePreloadedAuthQuery(preloadedCategoriesQuery);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateCategoryFormModal />
            </div>
            <CategoriesTable initialCategories={categories ?? undefined} />
        </div>
    );
}
