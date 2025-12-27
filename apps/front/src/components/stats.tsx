'use client'
import { useTranslations } from "next-intl";
import { ObjectivesStatusChart } from "@/components/objectives-status-chart";
import { MonthlyProgressChart } from "@/components/monthly-progress-chart";
import { ObjetivesMostProgressGraph } from "@/components/objectives-most-progress-graph";

export default function Stats() {
    const t = useTranslations('Stats');

    const sampleData = {
        totalObjectives: 50,
        pendingObjectives: 20,
        completedObjectives: 30,
        progressAddedPerMonth: [
            { month: t('sample.months.january'), count: 15 },
            { month: t('sample.months.february'), count: 25 },
            { month: t('sample.months.march'), count: 30 },
            { month: t('sample.months.april'), count: 22 },
            { month: t('sample.months.may'), count: 40 },
            { month: t('sample.months.june'), count: 35 },
        ],
        objectivesWithMostProgress: [
            { objective: t('sample.objectives.onboardingFlow'), progress: 90 },
            { objective: t('sample.objectives.marketingStrategy'), progress: 75 },
            { objective: t('sample.objectives.databaseMigration'), progress: 60 },
            { objective: t('sample.objectives.redesignUi'), progress: 45 },
            { objective: t('sample.objectives.technicalDocs'), progress: 30 },
        ],
    }

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
