import { getTranslations } from 'next-intl/server';
import { CreateObjectiveFormModal } from '@/features/objectives';
import { ResponsiveObjectivesView } from '@/features/objectives';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('Objectives');
    return {
        title: t('pageTitle'),
        description: t('pageDescription'),
    };
}

export default async function ObjectivesPage() {
    const t = await getTranslations('Objectives');

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
                <ResponsiveObjectivesView />
            </div>
        </div>
    );
}
