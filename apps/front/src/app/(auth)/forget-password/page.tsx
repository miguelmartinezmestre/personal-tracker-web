import Header from '@/features/landing/header';
import Footer from '@/features/landing/footer';
import ForgetPasswordForm from '@/features/auth/forget-password';
import { getTranslations } from 'next-intl/server';

export default async function ManageInvitationPage() {
    const t = await getTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        {t('forgotPassword')}
                    </h1>
                    <ForgetPasswordForm />
                </div>
            </div>
            <Footer />
        </div>
    );
}
