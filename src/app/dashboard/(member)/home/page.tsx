import { Graph1 } from '@/components/graph1';
import { Graph2 } from '@/components/graph2';
import { Graph3 } from '@/components/graph3';
import ObjetivesTable from '@/components/objectives/objetives-table';
import getUser from '@/server/getUser';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { Role } from '@prisma/client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

function t(key: string) {
    return key;
}

export default async function Dashboard() {

    const { name, email, id, role } = await getUser();

    const queryClient = getQueryClient();

    prefetch(trpc.objectives.getObjectivesByUser.queryOptions({}));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <h1 className="text-2xl font-bold">Welcome {name}</h1>
            <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"> 
                    <Graph1 />
                    <Graph2 />
                    <Graph3 />
                </div>
                <ObjetivesTable />
            </div>
        </HydrationBoundary>
    );
}
