'use client';

import { useTranslations } from 'next-intl';

export default function DashboardLoading() {
    const t = useTranslations('Common');

    return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-sm">{t('loading')}</p>
            </div>
        </div>
    );
}
