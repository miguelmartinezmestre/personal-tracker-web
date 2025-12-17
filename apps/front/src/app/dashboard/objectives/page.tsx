'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ResponsiveObjectivesView } from '@/components/objectives/responsive-objectives-view';
import CreateObjectiveFormModal from '@/components/objectives/objective-form-create-modal';

export default function ObjectivesPage() {
    const t = useTranslations('Objectives');

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('pageDescription')}</p>
                </div>
                <CreateObjectiveFormModal />
            </div>
            <Suspense fallback={<div>{t('loadingObjectives')}</div>}>
                <ResponsiveObjectivesView />
            </Suspense>
        </div>
    );
}
