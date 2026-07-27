import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import { cache } from 'react';
import { fetchPlatformDefaultLocale } from '@/lib/platform-locale';

const getValidLocale = cache(async () => {
    type AppLocale = (typeof routing.locales)[number];
    const isAppLocale = (value: string): value is AppLocale =>
        (routing.locales as readonly string[]).includes(value);

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

export default getRequestConfig(async () => {
    const validLocale = await getValidLocale();

    return {
        locale: validLocale,
        messages: (await import(`../translations/${validLocale}.json`)).default,
    };
});
