import { RegisterForm } from '@/features/auth';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { isPlatformSetUp } from '@/features/setup/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('HomePage', 'createAccount');

interface RegisterProps {
    searchParams: Promise<{ invitation?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function Register({ searchParams }: RegisterProps) {
    if (!(await isPlatformSetUp())) {
        redirect('/setup');
    }

    const [params, t, tSetup] = await Promise.all([
        searchParams,
        getTranslations('HomePage'),
        getTranslations('Setup'),
    ]);

    const client = new ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL);
    const settings = await client.query(api.setup.getPublicPlatformSettings);
    const registrationRequiresInvitation = settings?.registrationPolicy !== 'open';
    let invitationStatus = null;

    if (params.invitation) {
        invitationStatus = await client.query(api.organizations.getPublicInvitationStatus, {
            invitationId: params.invitation,
        });
    }

    if (registrationRequiresInvitation && !invitationStatus?.isValid) {
        const invalidInvitation = Boolean(params.invitation);
        let invitationTitle: string;
        let invitationMessage: string;

        if (invalidInvitation) {
            invitationTitle = tSetup('registrationPolicy.invalidInvitation');
            invitationMessage = tSetup('registrationPolicy.invalidInvitationMessage');
        } else {
            invitationTitle = tSetup('registrationPolicy.invitationOnly');
            invitationMessage = tSetup('registrationPolicy.invitationOnlyMessage');
        }

        return (
            <div className="w-full max-w-md rounded-xl shadow-lg p-8 border text-center">
                <h1 className="text-2xl font-bold mb-4 text-primary">{invitationTitle}</h1>
                <p className="text-muted-foreground">{invitationMessage}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md rounded-xl shadow-lg p-8 border">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                {t('createAccount')}
            </h1>
            <RegisterForm
                invitationToken={params.invitation}
                invitationIsValid={invitationStatus?.isValid ?? false}
            />
        </div>
    );
}
