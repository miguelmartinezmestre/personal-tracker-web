import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export function translatedPageTitle(namespace: string, key: string) {
    return async function generateMetadata(): Promise<Metadata> {
        const t = await getTranslations(namespace);

        return { title: t(key) };
    };
}
