'use client';

import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

/**
 * Tipos para las operaciones de miembros de equipo
 */
export interface CreateTeamMemberParams {
    team: Id<'organization'>;
    user: string;
    role: 'MANAGER' | 'MEMBER';
}

export interface UpdateTeamMemberParams {
    id: Id<'member'>;
    role: 'MANAGER' | 'MEMBER';
}

/**
 * Hook para obtener los miembros de un equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeamMembers(teamId: Id<'organization'> | null) {
    return useSuspenseQuery(
        convexQuery(api.teamMembers.getTeamMembersByTeamId, teamId ? { team: teamId } : 'skip')
    );
}

/**
 * Hook para crear un nuevo miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teamMembers.createTeamMember),
        onSuccess: (_data, variables) => {
            // Invalidar la query de miembros del equipo
            queryClient.invalidateQueries({
                queryKey: convexQuery(api.teamMembers.getTeamMembersByTeamId, {
                    team: variables.team,
                }).queryKey,
            });
        },
    });
}

/**
 * Hook para actualizar un miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teamMembers.updateTeamMember),
        onSuccess: () => {
            // Invalidar todas las queries de miembros de equipo
            queryClient.invalidateQueries({
                predicate: query => {
                    return query.queryKey[0] === 'convex' && 
                           typeof query.queryKey[1] === 'string' &&
                           query.queryKey[1].includes('teamMembers');
                },
            });
        },
    });
}

/**
 * Hook para eliminar un miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: useConvexMutation(api.teamMembers.deleteTeamMember),
        onSuccess: () => {
            // Invalidar todas las queries de miembros de equipo
            queryClient.invalidateQueries({
                predicate: query => {
                    return query.queryKey[0] === 'convex' && 
                           typeof query.queryKey[1] === 'string' &&
                           query.queryKey[1].includes('teamMembers');
                },
            });
        },
    });
}

