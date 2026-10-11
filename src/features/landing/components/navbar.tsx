import Link from 'next/link';
import { ThemeToggle } from '@/platform/theme/theme-switcher';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';
import type { Route } from 'next';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { useQuery } from '@tanstack/react-query';

type LinkItem = { name: string; href: Route };

function navbarLinkTestId(href: Route): string | undefined {
    if (href === '/register') {
        return 'navbar-register-link';
    }
    if (href === '/login') {
        return 'navbar-login-link';
    }
    return undefined;
}

export default function NavBar() {
    const t = useTranslations('HomePage');
    const links: LinkItem[] = [
        { name: t('register'), href: '/register' },
        { name: t('login'), href: '/login' },
    ];

    const sessionQuery = useQuery(convexQuery(api.organizations.getCurrentSession, {}));
    const isAuthenticated = Boolean(sessionQuery.data?.user);

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-2 lg:space-y-0 items-center">
            {!isAuthenticated &&
                links.map(link => (
                    <Link
                        key={link.name}
                        href={link.href}
                        className="text-primary hover:text-primary/80"
                        prefetch={false}
                        data-testid={navbarLinkTestId(link.href)}
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
