import { LoginForm } from '@/features/auth';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { isPlatformSetUp } from '@/features/setup/server';
import { getSafeCallbackPath } from '@/convex/features/auth/redirects';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('HomePage', 'login');
export const dynamic = 'force-dynamic';

export default async function Login({
    searchParams,
}: {
    searchParams: Promise<{
        passwordReset?: string;
        callbackUrl?: string | string[];
    }>;
}) {
    if (!(await isPlatformSetUp())) {
        redirect('/setup');
    }

    const params = await searchParams;
    const showPasswordResetSuccess = params.passwordReset === 'success';

    const callbackUrl = getSafeCallbackPath(
        Array.isArray(params.callbackUrl) ? undefined : params.callbackUrl
    );

    const t = await getTranslations('HomePage');

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">{t('login')}</h1>
            <LoginForm
                showPasswordResetSuccess={showPasswordResetSuccess}
                callbackUrl={callbackUrl}
            />
        </div>
    );
}
