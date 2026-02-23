import Footer from '@/features/landing/components/footer';
import Header from '@/features/landing/components/header';
import LoginForm from '@/features/auth/components/login-form';
import { getTranslations } from 'next-intl/server';

export default async function Login() {
    const t = await getTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        {t('login')}
                    </h1>
                    <LoginForm />
                </div>
            </div>
            <Footer />
        </div>
    );
}
