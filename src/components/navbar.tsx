import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-switcher';
import { useEffect, useState } from 'react';
// import { isLoggedInAction } from '@/server/actions';
import { LanguageSwitcher } from './language-switcher';
import { useLocale, useTranslations } from 'next-intl';

type LinkItem = { name: string; href: string };

type LinkArray = LinkItem[];

export default function NavBar() {
    const t = useTranslations('HomePage');
    const locale = useLocale();
    const [links, setLinks] = useState<LinkArray>([
        { name: t('register'), href: '/register' },
        { name: t('login'), href: '/login' },
    ]);

    // useEffect(() => {

    //     async function getIsLoggedIn() {
    //         const isLoggedIn = await isLoggedInAction();
    //         if (isLoggedIn?.data) {
    //             setLinks([
    //                 { name: t('register'), href: `/register` },
    //                 { name: t('login'), href: `/login` },
    //                 { name: t('goToDashboard'), href: '/dashboard/home' }]);
    //         } else {
    //             setLinks([
    //                 { name: t('register'), href: `/register` },
    //                 { name: t('login'), href: `/login` },
    //             ]);
    //         }
    //     }
    //     getIsLoggedIn();

    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [locale]);

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0 items-center">
            {links.map(link => (
                <Link key={link.name} href={link.href} className="text-primary hover:text-gray-700" prefetch={false}>
                    {link.name}
                </Link>
            ))}
            <div className="text-primary hover:text-gray-700">
                <ThemeToggle />
            </div>
            <div className="text-primary hover:text-gray-700">
                <LanguageSwitcher />
            </div>
        </div>
    );
}
