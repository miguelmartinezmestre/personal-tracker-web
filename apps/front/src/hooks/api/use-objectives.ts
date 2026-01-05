'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { Objective } from '@/schemas/objective';
import { objectiveTypeSchema, periodSchema, savedObjectiveSchema } from '@/schemas/objective';
import type { Doc } from '@repo/backend/convex/_generated/dataModel';

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

/**
 * Hook para obtener todos los objetivos del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useObjectives() {
    return useQuery({
        ...convexQuery(api.objectives.getObjectivesByUser, {}),
        select: objectives => objectives.map(normalizeObjective),
    });
}

/**
 * Hook para obtener un objetivo por su ID
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useObjective(objectiveId: Id<'objectives'> | null) {
    return useQuery({
        ...convexQuery(api.objectives.getObjectiveById, objectiveId ? { id: objectiveId } : 'skip'),
        select: objective => (objective ? normalizeObjective(objective) : null),
    });
}

/**
 * Hook para crear un nuevo objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.createObjective),
        onSuccess: () => {
            // Invalidar la query de objetivos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjective),
        onSuccess: () => {
            // Invalidar las queries relacionadas
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para eliminar un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.deleteObjective),
        onSuccess: () => {
            // Invalidar la query de objetivos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para completar un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCompleteObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.completeObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para pausar un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function usePauseObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.pauseObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para archivar un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useArchiveObjective() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.archiveObjective),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar el estado de un objetivo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateObjectiveStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.objectives.updateObjectiveStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.objectives.getObjectivesByUser, {}).queryKey,
            });
        },
    });
}
