'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import { useUser } from '@/contexts/user-context';

export default function HomePage() {
    const user = useUser();
    const searchParams = useSearchParams();
    const [showAlert, setShowAlert] = useState(false);

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
                      title: 'Access Denied',
                      description: 'You do not have permission to access this page.',
                      variant: 'destructive' as const,
                  }
                : {
                      icon: AlertTriangle,
                      title: 'Error',
                      description: 'An error occurred while accessing this page.',
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
                                            Go to Login
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
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                <p data-testid="welcome-message">Welcome {user.name}</p>
            </div>
        </div>
    );
}
