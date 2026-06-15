import Link from 'next/link';
import { ThemeToggle } from '@/platform/theme/theme-switcher';
import { useState } from 'react';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';
import { useSession } from '@/features/auth/hooks/use-session';
import type { Route } from 'next';

type LinkItem = { name: string; href: Route };

type LinkArray = LinkItem[];

export default function NavBar() {
    const t = useTranslations('HomePage');

    const [links] = useState<LinkArray>([
        { name: t('register'), href: '/register' },
        { name: t('login'), href: '/login' },
    ]);

    const sessionQuery = useSession();
    const isAuthenticated = Boolean(sessionQuery?.data?.user);

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0 items-center">
            {links.map(link => (
                <Link
                    key={link.name}
                    href={link.href}
                    className="text-primary hover:text-primary/80"
                    prefetch={false}
                    data-testid={
                        link.href === '/register'
                            ? 'navbar-register-link'
                            : link.href === '/login'
                              ? 'navbar-login-link'
                              : undefined
                    }
                >
                    {link.name}
                </Link>
            ))}
            {isAuthenticated && (
                <Link
                    href="/dashboard/home"
                    className="text-primary hover:text-primary/80"
                    prefetch={false}
                    data-testid="navbar-dashboard-link"
                >
                    {t('goToDashboard')}
                </Link>
            )}
            <div className="text-primary hover:text-primary/80">
                <ThemeToggle />
            </div>
            <div className="text-primary hover:text-primary/80">
                <LanguageSwitcher />
            </div>
        </div>
    );
}
