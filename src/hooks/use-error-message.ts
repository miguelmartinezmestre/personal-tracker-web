'use client';

import { useLocale } from 'next-intl';
import { resolveErrorMessage, type ErrorLocale } from '@/lib/error-messages';

/**
 * Returns a function that turns a thrown value (typically a backend
 * `ConvexError` code) into a localized, human-friendly message. Use this in
 * client components instead of showing `error.message` verbatim.
 */
export function useErrorMessage() {
    const locale = useLocale();
    const errorLocale: ErrorLocale = locale === 'es' ? 'es' : 'en';
    return (error: unknown, fallback?: string) => resolveErrorMessage(error, errorLocale, fallback);
}
