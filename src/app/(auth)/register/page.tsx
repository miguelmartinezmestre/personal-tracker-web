import { RegisterForm } from '@/features/auth';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { checkPlatformSetUp } from '@/features/setup/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { env } from '@/lib/env';

interface RegisterProps {
    searchParams: Promise<{ invitation?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function Register({ searchParams }: RegisterProps) {
    if (!(await checkPlatformSetUp())) redirect('/setup');

    const [params, t, tSetup] = await Promise.all([
        searchParams,
        getTranslations('HomePage'),
        getTranslations('Setup'),
    ]);

    const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
    const settings = await client.query(api.setup.getPublicPlatformSettings);
    const registrationRequiresInvitation = settings?.registrationPolicy !== 'open';

    if (registrationRequiresInvitation && !params.invitation) {
        return (
            <div className="w-full max-w-md rounded-xl shadow-lg p-8 border text-center">
                <h1 className="text-2xl font-bold mb-4 text-primary">
                    {tSetup('registrationPolicy.invitationOnly')}
                </h1>
                <p className="text-muted-foreground">
                    {tSetup('registrationPolicy.invitationOnlyMessage')}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                {t('createAccount')}
            </h1>
            <RegisterForm invitationToken={params.invitation} />
        </div>
    );
}
