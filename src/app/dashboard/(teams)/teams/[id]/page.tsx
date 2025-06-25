import CreateTeamMemberFormModal from "@/components/team-members/team-members-form-create-modal";
import TeamMembersTable from "@/components/team-members/team-members-table";
import CreateUpdateProgressFormModal from "@/components/update-progress/update-progress-form-create-modal";
import UpdateProgressTable from "@/components/update-progress/update-progress-table";
import { getQueryClient, prefetch, trpc } from "@/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export default async function Team({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    const t = await getTranslations('TeamMembers');
    const queryClient = getQueryClient()

    prefetch(trpc.teamMembers.getTeamMembersByTeamId.queryOptions({ teamId: Number(id) }));


    return (
        <>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">{t('title')} {id} </h1>
                    <CreateTeamMemberFormModal />
                </div>
                <TeamMembersTable />
            </HydrationBoundary>
        </>
    );
}

