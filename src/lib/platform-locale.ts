import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';
import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

function isAppLocale(value: string): value is AppLocale {
    return routing.locales.some(locale => locale === value);
}

export async function fetchPlatformDefaultLocale(): Promise<AppLocale | null> {
    try {
        const client = new ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL);
        const settings = await client.query(api.setup.getPublicPlatformSettings, {});
        const defaultLanguage = settings?.defaultLanguage;
        return defaultLanguage && isAppLocale(defaultLanguage) ? defaultLanguage : null;
    } catch {
        return null;
    }
}
