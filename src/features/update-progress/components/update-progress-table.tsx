'use client';

import { DataTable } from '@/features/table/components/table';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { FunctionReturnType } from 'convex/server';
import { ObjectiveProgressGraph } from '@/features/objectives/components/objective-graph';
import { useUpdateProgressTableColumns } from './update-progress-table-columns';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGINATION_OPTS = {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
};

type ProgressResult = FunctionReturnType<typeof api.update_progress.getUpdateProgressByObjectiveId>;
type ObjectiveResult = FunctionReturnType<typeof api.objectives.getObjectiveById>;

interface UpdateProgressTableProps {
    initialProgress: ProgressResult | undefined;
    initialObjective: ObjectiveResult | undefined;
}

function getPeriodRange(
    period: string | undefined,
    now: number,
    periodStart?: number,
    periodLengthDays?: number
) {
    if (!period || period === 'none') return null;

    const date = new Date(now);
    switch (period) {
        case 'weekly': {
            const day = date.getDay();
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() + diffToMonday);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'monthly': {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            return { start: start.getTime(), end: end.getTime() };
        }
        case 'custom': {
            if (!periodStart || !periodLengthDays || periodLengthDays <= 0) return null;
            const lengthMs = periodLengthDays * 24 * 60 * 60 * 1000;
            if (now < periodStart) {
                return { start: periodStart, end: periodStart + lengthMs };
            }
            const cycles = Math.floor((now - periodStart) / lengthMs);
            const start = periodStart + cycles * lengthMs;
            return { start, end: start + lengthMs };
        }
        default:
            return null;
    }
}

export default function UpdateProgressTable({
    initialProgress,
    initialObjective,
}: UpdateProgressTableProps) {
    const params = useParams();
    const objectiveIdParam = params.id;
    const objectiveId = (
        Array.isArray(objectiveIdParam) ? objectiveIdParam[0] : objectiveIdParam
    ) as Id<'objectives'>;

    const updateProgress = useQuery({
        ...convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            ...DEFAULT_PAGINATION_OPTS,
        }),
        initialData: initialProgress,
    });

    const objective = useQuery({
        ...convexQuery(api.objectives.getObjectiveById, { id: objectiveId }),
        initialData: initialObjective,
    });

    // Columns
    const columns = useUpdateProgressTableColumns({ objectiveId });

    const updates = updateProgress.data?.page ?? [];
    const objectiveDoc = objective.data as
        | (Doc<'objectives'> & {
              objectiveType?: string;
              period?: string;
              periodStart?: number;
              periodLengthDays?: number;
          })
        | undefined;
    const objectiveType = objectiveDoc?.objectiveType ?? 'value';
    const period = objectiveDoc?.period ?? 'none';
    const isEventBased = objectiveType !== 'value' || (period && period !== 'none');
    const range = objectiveDoc
        ? getPeriodRange(
              period,
              Date.now(),
              objectiveDoc.periodStart,
              objectiveDoc.periodLengthDays
          )
        : null;
    const sortedUpdates = [...updates].sort((a, b) => a.updateDate - b.updateDate);
    const relevantUpdates = range
        ? sortedUpdates.filter(
              update => update.updateDate >= range.start && update.updateDate < range.end
          )
        : sortedUpdates;

    type ProgressPoint = { date: number; currentValue: number; objective: number };
    let runningTotal = 0;
    const progressData: ProgressPoint[] = relevantUpdates.map((item: Doc<'progressUpdates'>) => {
        const currentValue = isEventBased ? (runningTotal += item.updatedValue) : item.updatedValue;
        return {
            date: item.updateDate,
            currentValue,
            objective: objectiveDoc?.targetValue ?? 0,
        };
    });
    const lastUpdated =
        relevantUpdates.length > 0 ? relevantUpdates[relevantUpdates.length - 1].updateDate : null;

    // Prepare updates for velocity and streak calculations
    const updatesForGraph = relevantUpdates.map((item: Doc<'progressUpdates'>) => ({
        date: item.updateDate,
        value: item.updatedValue,
    }));

    return (
        <div className="space-y-4">
            {progressData.length > 0 && (
                <ObjectiveProgressGraph
                    data={progressData}
                    unit={objectiveDoc?.unit ?? null}
                    targetValue={objectiveDoc?.targetValue ?? null}
                    period={period}
                    periodRange={range}
                    lastUpdated={lastUpdated}
                    deadline={objectiveDoc?.deadline ?? null}
                    updates={updatesForGraph}
                />
            )}

            <DataTable
                columns={columns}
                data={updateProgress.data?.page ?? []}
                isLoading={updateProgress.isLoading}
            />
        </div>
    );
}
