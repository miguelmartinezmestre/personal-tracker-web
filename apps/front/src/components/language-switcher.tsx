'use client';
import { Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@repo/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function LanguageSwitcher() {
    const t = useTranslations('LanguageSwitcher');
    const router = useRouter();
    const currentLocale = useLocale();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <span>{t('label')}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                        <span>{t('spanish')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <span>{t('english')}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    const handleLanguageChange = (newLocale: string) => {
        // Set the cookie with proper options
        // js-cookie uses 'expires' in days, not 'maxAge'
        Cookies.set('locale', newLocale, {
            path: '/',
            sameSite: 'lax',
            expires: 365 // 1 year in days
        });

        // Use router.refresh() to update the page without full reload
        // This will trigger a re-fetch of server components with the new locale
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    {currentLocale === 'es' ? <span>{t('spanish')}</span> : <span>{t('english')}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleLanguageChange('es')}
                >
                    <span>{t('spanish')}</span>
                    {currentLocale === 'es' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleLanguageChange('en')}
                >
                    <span>{t('english')}</span>
                    {currentLocale === 'en' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
