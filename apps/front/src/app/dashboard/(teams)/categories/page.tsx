import { getTranslations } from 'next-intl/server';
import CreateCategoryFormModal from '@/components/categories/category-form-create-modal';
import CategoriesTable from '@/components/categories/categories-table';

export default async function Categories() {
    const t = await getTranslations('Objectives.categories');

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
