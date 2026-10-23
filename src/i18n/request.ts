import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import { cache } from 'react';
import { fetchPlatformDefaultLocale } from '@/lib/platform-locale';
import enMessages from '../translations/en.json';
import esMessages from '../translations/es.json';

type AppLocale = (typeof routing.locales)[number];

function isAppLocale(value: string): value is AppLocale {
    return routing.locales.some(locale => locale === value);
}

function messagesForLocale(locale: AppLocale) {
    switch (locale) {
        case 'en':
            return enMessages;
        case 'es':
            return esMessages;
    }
}

const getValidLocale = cache(async () => {
    let locale: string | undefined;

    try {
        const cookieStore = await cookies();
        locale = cookieStore.get('locale')?.value;
    } catch {
        locale = undefined;
    }

    if (locale && isAppLocale(locale)) {
        return locale;
    }

    const platformDefault = await fetchPlatformDefaultLocale();

    if (platformDefault) {
        return platformDefault;
    }

    return routing.defaultLocale;
});

// An explicit locale, as in `getTranslations({ locale })`, wins over the visitor's one.
export default getRequestConfig(async ({ locale }) => {
    const validLocale = locale && isAppLocale(locale) ? locale : await getValidLocale();

    return {
        locale: validLocale,
        messages: messagesForLocale(validLocale),
    };
});
