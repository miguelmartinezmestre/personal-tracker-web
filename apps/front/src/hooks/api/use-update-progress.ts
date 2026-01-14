'use client';

import { useMutation, useSuspenseQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { usePaginationState } from '@/hooks/use-pagination';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Tipos para las operaciones de actualización de progreso
 */
export interface CreateUpdateProgressParams {
    objective: Id<'objectives'>;
    updatedValue: number;
    updateDate: number;
    comment?: string;
}

export interface UpdateUpdateProgressParams {
    id: Id<'progressUpdates'>;
    updatedValue: number;
    updateDate: number;
    comment?: string;
}

/**
 * Hook para obtener las actualizaciones de progreso de un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateProgressByObjective(objectiveId: Id<'objectives'> | null) {
    return useSuspenseQuery(
        convexQuery(
            api.update_progress.getUpdateProgressByObjectiveId,
            objectiveId
                ? {
                    objectiveId,
                    paginationOpts: {
                        numItems: DEFAULT_PAGE_SIZE,
                        cursor: null,
                    },
                }
                : 'skip'
        )
    );
}

/**
 * Hook para obtener las actualizaciones de progreso de un objetivo con paginación
 */
export function useUpdateProgressByObjectivePaginated(objectiveId: Id<'objectives'> | null, totalItems?: number) {
    const { currentPage, totalPages, nextPage, previousPage, goToPage, resetPage } = usePaginationState(totalItems, DEFAULT_PAGE_SIZE);

    const query = useQuery({
        ...convexQuery(
            api.update_progress.getUpdateProgressByObjectiveId,
            objectiveId
                ? {
                    objectiveId,
                    paginationOpts: {
                        numItems: DEFAULT_PAGE_SIZE,
                        cursor: currentPage === 0 ? null : currentPage.toString(),
                    },
                }
                : 'skip'
        ),
        enabled: !!objectiveId,
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

/**
 * Hook para crear una nueva actualización de progreso
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateUpdateProgress() {
    const queryClient = useQueryClient();
    const createUpdateProgress = useConvexMutation(api.update_progress.createUpdateProgress);

    return useMutation<unknown, Error, CreateUpdateProgressParams>({
        mutationFn: variables => createUpdateProgress(variables),
        onSuccess: (_data, variables) => {
            // Invalidar la query de actualizaciones de progreso del objetivo
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.update_progress.getUpdateProgressByObjectiveId, {
                    objectiveId: variables.objective,
                    paginationOpts: {
                        numItems: DEFAULT_PAGE_SIZE,
                        cursor: null,
                    },
                }).queryKey,
            });
            // También invalidar la query del objetivo para actualizar el currentValue
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectiveById, {
                    id: variables.objective,
                }).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {
                    paginationOpts: {
                        numItems: DEFAULT_PAGE_SIZE,
                        cursor: null,
                    },
                }).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar una actualización de progreso
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateUpdateProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.update_progress.updateUpdateProgress),
        onSuccess: () => {
            // Invalidar todas las queries relacionadas
            queryClient.invalidateQueries({
                predicate: query => {
                    return (
                        query.queryKey[0] === 'convex' &&
                        typeof query.queryKey[1] === 'string' &&
                        (query.queryKey[1].includes('update_progress') ||
                            query.queryKey[1].includes('objectives'))
                    );
                },
            });
        },
    });
}

/**
 * Hook para eliminar una actualización de progreso
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteUpdateProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.update_progress.deleteUpdateProgress),
        onSuccess: () => {
            // Invalidar todas las queries relacionadas
            queryClient.invalidateQueries({
                predicate: query => {
                    return (
                        query.queryKey[0] === 'convex' &&
                        typeof query.queryKey[1] === 'string' &&
                        (query.queryKey[1].includes('update_progress') ||
                            query.queryKey[1].includes('objectives'))
                    );
                },
            });
        },
    });
}
