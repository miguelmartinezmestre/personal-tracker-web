'use client';

import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

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
            objectiveId ? { objectiveId } : 'skip'
        )
    );
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
                }).queryKey,
            });
            // También invalidar la query del objetivo para actualizar el currentValue
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectiveById, {
                    id: variables.objective,
                }).queryKey,
            });
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
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
