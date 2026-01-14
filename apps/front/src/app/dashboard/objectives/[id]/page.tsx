import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import CreateUpdateProgressFormModal from '@/features/update-progress/components/update-progress-form-create-modal';
import UpdateProgressTable from '@/features/update-progress/components/update-progress-table';

export default async function ObjectiveDetailPage() {
    const tObjectives = await getTranslations('Objectives');
    const tUpdateProgress = await getTranslations('UpdateProgress');

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
