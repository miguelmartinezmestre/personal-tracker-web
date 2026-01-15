'use client';

import { useTranslations } from 'next-intl';
import { AchievementsWidget } from '@/features/achievements/components/achievements-widget';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
    const { data: user, isLoading: isUserLoading } = useQuery(convexQuery(api.auth.getCurrentUser, {}));

    const t = useTranslations('DashboardHome');

    console.log(user);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">{t('dashboardTitle')}</h1>
                <p
                    data-testid="welcome-message"
                    className="text-muted-foreground"
                >
                    {isUserLoading || !user ? <Loader2 className="animate-spin" /> : t('welcome', { name: user?.name ?? '' })}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="md:col-span-2 lg:col-span-1">
                    <AchievementsWidget />
                </div>
            </div>
        </div>
    );
}
