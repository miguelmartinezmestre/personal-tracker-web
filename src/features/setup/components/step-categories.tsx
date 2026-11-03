'use client';

import { useTranslations } from 'next-intl';
import { CategoryListEditor } from '@/features/categories/components/category-list-editor';
import type { CategoryDraft } from '@/features/categories/schemas/category';

interface StepCategoriesProps {
    data: CategoryDraft[];
    onChange: (data: CategoryDraft[]) => void;
}

export default function StepCategories({ data, onChange }: StepCategoriesProps) {
    const t = useTranslations('Setup');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t('categories.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('categories.description')}</p>
            </div>
            <CategoryListEditor value={data} onChange={onChange} />
        </div>
    );
}
