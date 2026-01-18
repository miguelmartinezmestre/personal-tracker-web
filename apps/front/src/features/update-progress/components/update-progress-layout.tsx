'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import CreateUpdateProgressFormModal from './update-progress-form-create-modal';
import UpdateProgressTable from './update-progress-table';

export default function UpdateProgressLayout() {
    const tObjectives = useTranslations('Objectives');
    const tUpdateProgress = useTranslations('UpdateProgress');

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {tObjectives('objectiveProgress')}
                    </h1>
                    <p className="text-muted-foreground">{tUpdateProgress('pageDescription')}</p>
                </div>
                <CreateUpdateProgressFormModal />
            </div>

            <Suspense fallback={<div>{tUpdateProgress('loadingProgress')}</div>}>
                <UpdateProgressTable />
            </Suspense>
        </div>
    );
}
