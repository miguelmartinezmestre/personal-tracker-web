import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

export default getRequestConfig(async () => {
    type AppLocale = (typeof routing.locales)[number];
    const isAppLocale = (value: string): value is AppLocale =>
        (routing.locales as readonly string[]).includes(value);

    // Priority: Cookie > Default locale (English)
    // We only use cookies for locale detection, no URL prefixes
    let locale: string | undefined;

    try {
        const cookieStore = await cookies();
        locale = cookieStore.get('locale')?.value;
    } catch (error) {
        // Fallback if cookie reading fails
        console.error('Error reading locale cookie:', error);
    }

    // Validate locale and default to English if not found or invalid
    const validLocale: AppLocale = locale && isAppLocale(locale) ? locale : routing.defaultLocale;

    return {
        locale: validLocale,
        messages: (await import(`../../translations/${validLocale}.json`)).default,
    };
});
