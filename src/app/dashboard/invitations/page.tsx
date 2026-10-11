import { InvitationsLayout } from '@/features/organizations';
import { translatedPageTitle } from '@/lib/page-metadata';

export const generateMetadata = translatedPageTitle('Sidebar', 'invitations');

export default function InvitationsPage() {
    return <InvitationsLayout />;
}
