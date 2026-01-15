'use client';

import { useTeam } from '@/features/organizations/hooks/use-teams';
import CreateTeamMemberFormModal from '@/features/organizations/components/team-members-form-create-modal';
import TeamMembersTable from '@/features/organizations/components/team-members-table';
import { Skeleton } from '@repo/ui/components/skeleton';

interface TeamDetailClientProps {
    teamId: string;
}

export default function TeamDetailClient({ teamId }: TeamDetailClientProps) {
    // Use team hook to get team by ID
    const { data: team, isLoading } = useTeam(teamId);

    if (isLoading) {
        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-64 w-full" />
            </>
        );
    }

    if (!team) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Team not found</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">
                    {team.name}{' '}
                    <span className="text-sm text-muted-foreground">({team.slug})</span>
                </h1>
                <CreateTeamMemberFormModal teamId={team.id} />
            </div>
            <TeamMembersTable teamId={team.id} />
        </>
    );
}
