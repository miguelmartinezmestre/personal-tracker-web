import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import CreateObjectiveFormModal from '@/features/objectives/components/objective-form-create-modal';
import { ResponsiveObjectivesView } from '@/features/objectives/components/responsive-objectives-view';
import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';
import { createTranslator } from 'next-intl';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Objectives');
    return {
        title: t('pageTitle'),
        description: t('pageDescription'),
    };
}

export default async function ObjectivesPage() {
    let preloadedObjectivesQuery: Preloaded<typeof api.objectives.getObjectivesByUser>;
    let t: ReturnType<typeof createTranslator<Record<string, any>, 'Objectives'>>;

    try {
        [t, preloadedObjectivesQuery] = await Promise.all([
            getTranslations('Objectives'),
            preloadAuthQuery(api.objectives.getObjectivesByUser, {
                paginationOpts: { numItems: 1000, cursor: null },
            }),
        ]);
    } catch (error) {
        console.error(error);
        redirect('/dashboard/home');
    }
    // Start all promises in parallel

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
