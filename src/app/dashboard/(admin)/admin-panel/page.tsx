import CreateTeamFormModal from "@/components/teams/team-form-create-modal";
import TeamsTable from "@/components/teams/team-table";
import { getQueryClient, prefetch, trpc } from "@/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default function AdminPanel() {

    const queryClient = getQueryClient()

    prefetch(trpc.teams.getTeams.queryOptions({}));
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Teams </h1>
                <CreateTeamFormModal />
            </div>
            <TeamsTable />
        </HydrationBoundary>
    );
}
