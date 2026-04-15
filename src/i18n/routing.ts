import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['en', 'es'],
    defaultLocale: 'en',
    localePrefix: 'never',
    localeCookie: {
        name: 'locale',
        maxAge: 31536000,
        sameSite: 'lax' as const,
        path: '/',
    },
});
