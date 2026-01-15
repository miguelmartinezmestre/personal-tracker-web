import TeamDetailClient from '@/features/teams/team-detail-client';

export default async function Team({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TeamDetailClient teamId={id} />;
}
