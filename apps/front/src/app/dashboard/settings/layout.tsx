'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { SettingsLayout as SettingsLayoutComponent } from '@/components/settings-layout';
import { authClient } from '@/lib/auth-client';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const tCommon = useTranslations('Common');
    const router = useRouter();

    const sessionQuery = authClient.useSession();
    const session = sessionQuery?.data;
    const isSessionLoading = sessionQuery?.isPending;

    useEffect(() => {
        if (isSessionLoading) return;
        if (!session?.user) {
            router.replace('/login?redirect=/dashboard/settings');
        }
    }, [isSessionLoading, session, router]);

    if (isSessionLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('loading')}</div>
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div>{tCommon('redirectingToLogin')}</div>
            </div>
        );
    }

    return <SettingsLayoutComponent>{children}</SettingsLayoutComponent>;
}
