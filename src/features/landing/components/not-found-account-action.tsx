'use client';

import Link from 'next/link';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';

/** Signed-in visitors get a way back to their dashboard instead of a login link. */
export function NotFoundAccountAction() {
    const t = useTranslations('HomePage');
    const session = useQuery(convexQuery(api.organizations.getCurrentSession, {}));

    if (session.data?.user) {
        return (
            <Button
                nativeButton={false}
                render={
                    <Link
                        href="/dashboard/home"
                        prefetch={false}
                        data-testid="not-found-dashboard-link"
                    />
                }
                variant="outline"
                className="w-full sm:w-auto"
            >
                <LayoutDashboard aria-hidden />
                {t('goToDashboard')}
            </Button>
        );
    }

    return (
        <Button
            nativeButton={false}
            render={<Link href="/login" prefetch={false} data-testid="not-found-login-link" />}
            variant="outline"
            className="w-full sm:w-auto"
        >
            <LogIn aria-hidden />
            {t('login')}
        </Button>
    );
}
