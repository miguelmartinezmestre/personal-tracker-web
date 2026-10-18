'use client';

import { useLocale } from 'next-intl';
import { resolveErrorMessage, type ErrorLocale } from '@/lib/error-messages';

export function useErrorMessage() {
    const locale = useLocale();
    const errorLocale: ErrorLocale = locale === 'es' ? 'es' : 'en';

    return (error: unknown, fallback?: string) => resolveErrorMessage(error, errorLocale, fallback);
}
