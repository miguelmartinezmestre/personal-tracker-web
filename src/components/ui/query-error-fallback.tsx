'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QueryErrorFallbackProps {
    onRetry?: () => void;
    className?: string;
}

export function QueryErrorFallback({ onRetry, className }: QueryErrorFallbackProps) {
    const t = useTranslations('Common');

    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground',
                className
            )}
        >
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p>{t('queryError')}</p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    {t('actions.retry')}
                </Button>
            )}
        </div>
    );
}
