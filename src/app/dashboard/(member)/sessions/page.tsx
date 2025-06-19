import SessionsTable from "@/components/sessions/sessions-table";
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';


export default function Objectives() {

    const queryClient = getQueryClient()

    prefetch(trpc.sessions.getSessionsByUser.queryOptions({}));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Sessions </h1>
        </div>
        <SessionsTable />
    </HydrationBoundary>
    )
}

