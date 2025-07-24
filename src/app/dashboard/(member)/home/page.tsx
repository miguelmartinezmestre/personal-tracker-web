import ObjetivesTable from '@/components/objectives/objetives-table';
import getUser from '@/server/getUser';
import { getQueryClient, prefetch, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import Stats from '@/components/stats';

export default async function Dashboard() {

    const { name } = await getUser();

    const queryClient = getQueryClient();

    prefetch(trpc.objectives.getObjectivesByUser.queryOptions({}));
    prefetch(trpc.user.getDashboardGraphsData.queryOptions({}));

    // const [results] = await db
    // .select({
    //     total_objectives: count(),
    //     pending_objectives: count(sql`CASE WHEN ${objective.currentValue} != ${objective.targetValue} THEN 1 END`),
    //     completed_objectives: count(sql`CASE WHEN ${objective.currentValue} = ${objective.targetValue} THEN 1 END`),
    // })
    // .from(objective)
    // .where(eq(objective.userId, id));

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <h1 className="text-2xl font-bold" data-testid="welcome-message">Welcome {name}</h1>
            <Stats />
            {/* <div>
                <ObjetivesTable />
            </div> */}
        </HydrationBoundary>
    );
}
