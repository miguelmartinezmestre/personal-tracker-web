'use client';

import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

/**
 * Tipos para las operaciones de equipos
 */
export interface CreateTeamParams {
    name: string;
    description: string;
}

export interface UpdateTeamParams {
    _id: Id<'organization'>;
    name: string;
    description: string;
}

/**
 * Hook para obtener todos los equipos del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeams() {
    return useSuspenseQuery(convexQuery(api.teams.getTeams, {}));
}

/**
 * Hook para obtener un equipo por su ID
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeam(teamId: Id<'organization'> | null) {
    return useSuspenseQuery(
        convexQuery(api.teams.getTeamById, teamId ? { _id: teamId } : 'skip')
    );
}

/**
 * Hook para crear un nuevo equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teams.createTeam),
        onSuccess: () => {
            // Invalidar la query de equipos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.teams.getTeams, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar un equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teams.updateTeam),
        onSuccess: () => {
            // Invalidar las queries relacionadas
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.teams.getTeams, {}).queryKey,
            });
        },
    });
}

/**
 * Hook para eliminar un equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teams.deleteTeam),
        onSuccess: () => {
            // Invalidar la query de equipos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.teams.getTeams, {}).queryKey,
            });
        },
    });
}

