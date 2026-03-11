import InvitationContent from './invitation-content';

interface InvitationPageProps {
    params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
    const { token } = await params;
    return <InvitationContent token={token} />;
}
