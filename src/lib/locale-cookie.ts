import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

export function setLocaleCookie(locale: AppLocale) {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
}
