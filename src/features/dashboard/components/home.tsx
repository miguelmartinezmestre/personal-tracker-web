'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { QueryErrorFallback } from '@/components/ui/query-error-fallback';

export default function Home() {
    const t = useTranslations('DashboardHome');
    const userQuery = useQuery(convexQuery(api.auth.getCurrentUser, {}));
    const { data: user, isError, error, refetch } = userQuery;

    if (isError) {
        return <QueryErrorFallback error={error} onRetry={() => void refetch()} />;
    }

    return (
        <div className="flex flex-col gap-4" data-testid="dashboard-home-stub">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="welcome-message">
                {user?.name ? t('welcome', { name: user.name }) : t('welcomeAnonymous')}
            </h1>
            <p
                className="text-muted-foreground max-w-prose text-sm"
                data-testid="dashboard-home-empty"
            >
                {t('emptyState')}
            </p>
        </div>
    );
}
