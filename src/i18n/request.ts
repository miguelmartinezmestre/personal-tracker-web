import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import { cache } from 'react';

const getValidLocale = cache(async () => {
    type AppLocale = (typeof routing.locales)[number];
    const isAppLocale = (value: string): value is AppLocale =>
        (routing.locales as readonly string[]).includes(value);

    let locale: string | undefined;

    try {
        const cookieStore = await cookies();
        locale = cookieStore.get('locale')?.value;
    } catch {
        // Cookies not available in static generation, fallback to default
    }

    const validLocale: AppLocale = locale && isAppLocale(locale) ? locale : routing.defaultLocale;

    return validLocale;
});

export default getRequestConfig(async () => {
    const validLocale = await getValidLocale();

    return {
        locale: validLocale,
        messages: (await import(`../translations/${validLocale}.json`)).default,
    };
});
