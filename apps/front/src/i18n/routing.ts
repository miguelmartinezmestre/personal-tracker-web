import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['en', 'es'],

    // Used when no locale matches
    defaultLocale: 'en',

    // The locale prefix strategy
    // 'never' means no locale prefix in URLs (we use cookies instead)
    localePrefix: 'never',

    // Cookie name for locale detection
    // The middleware will read from this cookie
    localeCookie: {
        name: 'locale',
        maxAge: 31536000, // 1 year
        sameSite: 'lax' as const,
        path: '/',
    },
});
