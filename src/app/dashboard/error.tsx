'use client';

import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/hooks/use-error-message';

export default function DashboardError({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    const t = useTranslations('Common');
    const getErrorMessage = useErrorMessage();

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">{t('somethingWentWrong')}</h2>
            <p className="text-muted-foreground text-sm max-w-md">
                {getErrorMessage(error, t('genericErrorDescription'))}
            </p>
            <button
                onClick={retry}
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                {t('actions.retry')}
            </button>
        </div>
    );
}
