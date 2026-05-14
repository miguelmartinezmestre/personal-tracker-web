import LoginForm from '@/features/auth/components/login-form';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/lib/setup-check';

export default async function Login() {
    if (!(await checkPlatformSetUp())) redirect('/setup');

    const t = await getTranslations('HomePage');

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">{t('login')}</h1>
            <LoginForm />
        </div>
    );
}
