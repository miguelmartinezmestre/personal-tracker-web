import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-switcher';
import { useState } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';
import { api } from '@repo/backend/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { Authenticated } from 'convex/react';
import type { Route } from 'next';

type LinkItem = { name: string; href: Route };

type LinkArray = LinkItem[];

export default function NavBar() {
    const t = useTranslations('HomePage');

    const [links] = useState<LinkArray>([
        { name: t('register'), href: '/register' },
        { name: t('login'), href: '/login' },
    ]);

    const { data: _isAuthenticated } = useQuery(convexQuery(api.auth.isAuthenticated, {}));

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0 items-center">
            {links.map(link => (
                <Link
                    key={link.name}
                    href={link.href}
                    className="text-primary hover:text-gray-700"
                    prefetch={false}
                >
                    {link.name}
                </Link>
            ))}
            <Authenticated>
                <Link
                    href="/dashboard/home"
                    className="text-primary hover:text-gray-700"
                    prefetch={false}
                >
                    {t('goToDashboard')}
                </Link>
            </Authenticated>
            <div className="text-primary hover:text-gray-700">
                <ThemeToggle />
            </div>
            <div className="text-primary hover:text-gray-700">
                <LanguageSwitcher />
            </div>
        </div>
    );
}
