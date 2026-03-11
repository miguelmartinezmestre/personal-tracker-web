import Header from '@/features/landing/components/header';
import Footer from '@/features/landing/components/footer';
import RegisterForm from '@/features/auth/components/register-form';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/lib/setup-check';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

interface RegisterProps {
    searchParams: Promise<{ invitation?: string }>;
}

export default async function Register({ searchParams }: RegisterProps) {
    if (!(await checkPlatformSetUp())) redirect('/setup' as never);

    const [params, t, tSetup] = await Promise.all([
        searchParams,
        getTranslations('HomePage'),
        getTranslations('Setup'),
    ]);

    // Check registration policy
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const settings = await client.query(api.setup.getPublicPlatformSettings);

    if (settings?.registrationPolicy === 'invitation-only' && !params.invitation) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <div className="flex-grow flex items-center justify-center p-6">
                    <div className="w-full max-w-md rounded-xl shadow-lg p-8 border text-center">
                        <h1 className="text-2xl font-bold mb-4 text-primary">
                            {tSetup('registrationPolicy.invitationOnly')}
                        </h1>
                        <p className="text-muted-foreground">
                            {tSetup('registrationPolicy.invitationOnlyMessage')}
                        </p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-grow flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
                    <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                        {t('createAccount')}
                    </h1>
                    <RegisterForm invitationToken={params.invitation} />
                </div>
            </div>
            <Footer />
        </div>
    );
}
