import { ForgetPasswordForm } from '@/features/auth';
import { getTranslations } from 'next-intl/server';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('HomePage', 'forgotPassword');

export default async function ManageInvitationPage() {
    const t = await getTranslations('HomePage');

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                {t('forgotPassword')}
            </h1>
            <ForgetPasswordForm />
        </div>
    );
}
