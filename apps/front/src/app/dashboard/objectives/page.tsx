
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import { ResponsiveObjectivesView } from '@/features/objectives/components/responsive-objectives-view';
import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';

export default async function ObjectivesPage() {
    // Start all promises in parallel
    const [t, preloadedObjectivesQuery] = await Promise.all([
        getTranslations('Objectives'),
        preloadAuthQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: {
                numItems: 1000,
                cursor: null,
            },
        }),
    ]);

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
                <ResponsiveObjectivesView preloadedObjectivesQuery={preloadedObjectivesQuery} />
            </Suspense>
        </div>
    );
}
