'use client'

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ObjectivesStatusChart } from "@/components/objectives-status-chart";
import { MonthlyProgressChart } from "@/components/monthly-progress-chart";
import { ObjetivesMostProgressGraph } from "@/components/objectives-most-progress-graph";

const sampleData = {
    totalObjectives: 50,
    pendingObjectives: 20,
    completedObjectives: 30,
    progressAddedPerMonth: [
      { month: "January", count: 15 },
      { month: "February", count: 25 },
      { month: "March", count: 30 },
      { month: "April", count: 22 },
      { month: "May", count: 40 },
      { month: "June", count: 35 },
    ],
    objectivesWithMostProgress: [
      { objective: "Develop New Onboarding Flow", progress: 90 },
      { objective: "Finalize Q3 Marketing Strategy", progress: 75 },
      { objective: "Complete Database Migration", progress: 60 },
      { objective: "Redesign User Interface", progress: 45 },
      { objective: "Write Technical Documentation", progress: 30 },
    ],
  }


export default function Stats() {

    // const trpc = useTRPC();
    // const objectives = useSuspenseQuery(trpc.user.getDashboardGraphsData.queryOptions({}));

    return (
        <>
            <div className="bg-muted/40 min-h-screen w-full p-4 sm:p-8">
                <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <ObjectivesStatusChart completed={sampleData.completedObjectives} pending={sampleData.pendingObjectives} />
                    </div>
                    <div className="lg:col-span-2">
                        <MonthlyProgressChart data={sampleData.progressAddedPerMonth} />
                    </div>
                    <div className="lg:col-span-3">
                        <ObjetivesMostProgressGraph data={sampleData.objectivesWithMostProgress} />
                    </div>
                </div>
            </div>
        </>
    );
}

