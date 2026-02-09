'use client';
import { Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const locales = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
] as const;

export function LanguageSwitcher() {
    const t = useTranslations('LanguageSwitcher');
    const router = useRouter();
    const currentLocale = useLocale();

    const handleLanguageChange = (newLocale: string) => {
        Cookies.set('locale', newLocale, {
            path: '/',
            sameSite: 'lax',
            expires: 365,
        });
        router.refresh();
    };

    const currentLocaleData = locales.find(l => l.value === currentLocale) || locales[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="language-switcher" className="min-w-[100px]">
                    <span className="hidden sm:inline">{currentLocaleData.label}</span>
                    <span className="sr-only">{t('label')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {locales.map(locale => (
                    <DropdownMenuItem
                        key={locale.value}
                        onClick={() => handleLanguageChange(locale.value)}
                        data-testid={`language-option-${locale.value}`}
                        className="flex items-center gap-3 cursor-pointer"
                    >
                        <span className="flex-1">{locale.label}</span>
                        {currentLocale === locale.value && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
