'use client';

import { useUser } from '@/contexts/user-context';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
    const user = useUser();
    const searchParams = useSearchParams();
    const [showAlert, setShowAlert] = useState(false);

    const t = useTranslations('DashboardHome');
    const tCommon = useTranslations('Common');

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            setShowAlert(true);
        }
    }, [searchParams]);

    const error = searchParams.get('error');
    const redirect = searchParams.get('redirect');

    if (error && showAlert) {
        const alertContent =
            error === 'unauthorized'
                ? {
                      icon: ShieldAlert,
                      title: t('accessDeniedTitle'),
                      description: t('accessDeniedDescription'),
                      variant: 'destructive' as const,
                  }
                : {
                      icon: AlertTriangle,
                      title: t('genericErrorTitle'),
                      description: t('genericErrorDescription'),
                      variant: 'destructive' as const,
                  };

        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="max-w-md w-full">
                    <Alert variant={alertContent.variant}>
                        <alertContent.icon className="h-4 w-4" />
                        <AlertTitle>{alertContent.title}</AlertTitle>
                        <AlertDescription>
                            {alertContent.description}
                            {redirect && (
                                <div className="mt-4">
                                    <Link href="/login">
                                        <Button variant="outline" size="sm">
                                            {tCommon('actions.goToLogin')}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">{t('dashboardTitle')}</h1>
                <p data-testid="welcome-message">{t('welcome', { name: user.name })}</p>
            </div>
        </div>
    );
}
