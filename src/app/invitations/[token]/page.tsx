import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';
import InvitationContent from './invitation-content';

interface InvitationPageProps {
    params: Promise<{ token: string }>;
}

export const dynamic = 'force-dynamic';

export default async function InvitationPage({ params }: InvitationPageProps) {
    const { token } = await params;
    const client = new ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL);
    const { isValid } = await client.query(api.organizations.getPublicInvitationStatus, {
        invitationId: token,
        now: Date.now(),
    });
    return <InvitationContent token={token} invitationValid={isValid} />;
}
