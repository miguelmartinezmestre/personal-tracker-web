'use client'

import StatsHeader from "@/components/stats-header";
import { ProgressUpdatesAddedPerMonthGraph } from "@/components/progress-updates-added-per-month-graph";
import { RemainDaysToDeadlineGraph } from "@/components/remain-days-to-deadline-graph";
import { ObjetivesMostProgressGraph } from "@/components/objectives-most-progress-graph";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";


export default function Stats() {

    const trpc = useTRPC();
    const objectives = useSuspenseQuery(trpc.user.getDashboardGraphsData.queryOptions({}));

    return (
        <>
            <StatsHeader
                totalObjectives={objectives.data?.totalObjectives || 0}
                completedObjectives={objectives.data?.completedObjectives || 0}
                pendingObjectives={objectives.data?.pendingObjectives || 0}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <ProgressUpdatesAddedPerMonthGraph data={objectives.data?.progressAddedPerMonth} />
                <RemainDaysToDeadlineGraph data={objectives.data?.mostRecentObjectivesDeadlines} />
                <ObjetivesMostProgressGraph data={objectives.data?.objectivesWithMostProgress} />
            </div>
        </>
    );
}

