'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Doc, Id } from '@repo/backend/convex/_generated/dataModel';
import type { Objective } from '@/schemas/objective';
import { objectiveTypeSchema, periodSchema, savedObjectiveSchema } from '@/schemas/objective';
import { usePaginationState } from '@/hooks/use-pagination';

const DEFAULT_PAGE_SIZE = 20;

export interface CreateObjectiveParams {
    title: string;
    targetValue: number;
    currentValue: number;
    description?: string | null;
    category?: string | null;
    deadline?: number | null;
    status?: string | null;
    unit?: string | null;
    objectiveType?: string | null;
    period?: string | null;
    periodStart?: number | null;
    periodLengthDays?: number | null;
}

export interface UpdateObjectiveParams {
    id: Id<'objectives'>;
    title?: string;
    description?: string | null;
    category?: string | null;
    targetValue?: number;
    currentValue?: number;
    deadline?: number | null;
    status?: string | null;
    unit?: string | null;
    objectiveType?: string | null;
    period?: string | null;
    periodStart?: number | null;
    periodLengthDays?: number | null;
}

const normalizeObjective = (objective: Doc<'objectives'>): Objective => {
    const objectiveType = objectiveTypeSchema.safeParse(objective.objectiveType).success
        ? objective.objectiveType
        : null;
    const period = periodSchema.safeParse(objective.period).success ? objective.period : null;

    return savedObjectiveSchema.parse({
        _id: String(objective._id),
        title: objective.title,
        description: objective.description ?? null,
        category: objective.category ?? null,
        targetValue: objective.targetValue,
        currentValue: objective.currentValue,
        deadline: objective.deadline ?? null,
        status: objective.status ?? null,
        unit: objective.unit ?? null,
        objectiveType,
        period,
        periodStart: objective.periodStart ?? null,
        periodLengthDays: objective.periodLengthDays ?? null,
    });
};

export { normalizeObjective };

const OBJECTIVES_QUERY_KEY = convexQuery(api.objectives.getObjectivesByUser, {
    paginationOpts: {
        numItems: DEFAULT_PAGE_SIZE,
        cursor: null,
    },
}).queryKey;

/** Hook to fetch all objectives for the current user */
export function useObjectives() {
    return useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: {
                numItems: DEFAULT_PAGE_SIZE,
                cursor: null,
            },
        }),
        select: data => data.page.map(normalizeObjective),
    });
}

/** Hook to fetch a single objective by ID */
export function useObjective(objectiveId: Id<'objectives'> | null) {
    return useQuery({
        ...convexQuery(api.objectives.getObjectiveById, objectiveId ? { id: objectiveId } : 'skip'),
        select: objective => (objective ? normalizeObjective(objective) : null),
    });
}

/** Hook to create a new objective */
export function useCreateObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to update an objective */
export function useUpdateObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to delete an objective */
export function useDeleteObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to complete an objective */
export function useCompleteObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.completeObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to pause an objective */
export function usePauseObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.pauseObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to archive an objective */
export function useArchiveObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.archiveObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to update an objective's status */
export function useUpdateObjectiveStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjectiveStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OBJECTIVES_QUERY_KEY });
        },
    });
}

/** Hook to fetch paginated objectives for the current user */
export function useObjectivesPaginated(totalItems?: number) {
    const { currentPage, totalPages, nextPage, previousPage, goToPage, resetPage } = usePaginationState(totalItems, DEFAULT_PAGE_SIZE);

    const query = useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {
            paginationOpts: {
                numItems: DEFAULT_PAGE_SIZE,
                cursor: currentPage === 0 ? null : currentPage.toString(),
            },
        }),
        select: data => ({
            page: data.page.map(normalizeObjective),
            continueCursor: data.continueCursor,
            isDone: data.isDone,
        }),
    });

    return {
        ...query,
        currentPage,
        totalPages,
        nextPage,
        previousPage,
        goToPage,
        resetPage,
    };
}
