'use client';

import { useSyncExternalStore } from 'react';

const COPY = {
    en: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        retry: 'Try again',
    },
    es: {
        title: 'Algo ha salido mal',
        description: 'Se ha producido un error inesperado. Inténtalo de nuevo.',
        retry: 'Reintentar',
    },
} as const;

type SupportedLocale = keyof typeof COPY;

const subscribeToLocale = () => () => undefined;

function getBrowserLocale(): SupportedLocale {
    const localeCookie = document.cookie
        .split('; ')
        .find(cookie => cookie.startsWith('locale='))
        ?.split('=')[1];

    if (localeCookie === 'es' || localeCookie === 'en') {
        return localeCookie;
    }
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export default function GlobalError({
    unstable_retry,
}: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
}) {
    const locale = useSyncExternalStore<SupportedLocale>(
        subscribeToLocale,
        getBrowserLocale,
        () => 'en'
    );

    const copy = COPY[locale];

    return (
        <html lang={locale}>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                    <h2 className="text-lg font-semibold text-red-600">{copy.title}</h2>
                    <p className="max-w-md text-sm text-neutral-600">{copy.description}</p>
                    <button
                        type="button"
                        onClick={unstable_retry}
                        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                        {copy.retry}
                    </button>
                </div>
            </body>
        </html>
    );
}
