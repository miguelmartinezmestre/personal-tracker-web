import { ResetPassword } from '@/features/auth';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('HomePage', 'resetPassword');

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;

    const rawKey = params.token ?? params.key;
    const resetPasswordKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!resetPasswordKey) {
        redirect('/forget-password');
    }

    const t = await getTranslations('HomePage');

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                {t('resetPassword')}
            </h1>
            <ResetPassword resetPasswordKey={resetPasswordKey} />
        </div>
    );
}
