'use client';

import { useTranslations } from 'next-intl';
import CreateCategoryFormModal from './category-form-create-modal';
import CategoriesTable from './categories-table';

export default function CategoriesLayout() {
    const t = useTranslations('Objectives.categories');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <CreateCategoryFormModal />
            </div>
            <CategoriesTable />
        </div>
    );
}
