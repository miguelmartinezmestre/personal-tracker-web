'use client';

import { useTranslations } from 'next-intl';
import { useConvexAuth } from 'convex/react';
import SessionsTable from './sessions-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function SessionsLayout() {
    const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
    const t = useTranslations('Sessions');

    if (authLoading || !isAuthenticated) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="mt-2 h-5 w-96" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="sessions-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="sessions-title">
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>
            <SessionsTable />
        </div>
    );
}
