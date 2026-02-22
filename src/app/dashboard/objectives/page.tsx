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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- next-intl createTranslator generic
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
        <div className="w-full min-w-0 space-y-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('pageDescription')}</p>
                </div>
                <div className="w-full sm:w-auto">
                    <CreateObjectiveFormModal />
                </div>
            </div>
            <div className="min-w-0">
                <Suspense fallback={<div>{t('loadingObjectives')}</div>}>
                    <ResponsiveObjectivesView preloadedObjectivesQuery={preloadedObjectivesQuery} />
                </Suspense>
            </div>
        </div>
    );
}
