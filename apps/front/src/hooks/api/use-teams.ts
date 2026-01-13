'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { api } from '@repo/backend/convex/_generated/api';
import type { CreateTeam, Team } from '@/schemas/team';

/**
 * Tipos para las operaciones de equipos
 */
export interface CreateTeamParams {
    name: string;
    description: string;
}

export interface UpdateTeamParams {
    id: string;
    name: string;
    description: string;
}

const TEAMS_QUERY_KEY = ['teams'];

// Organization is a BetterAuth table, so we use a generic type
type OrganizationDoc = {
    _id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
};

const normalizeTeam = (team: OrganizationDoc) =>
    ({
        id: String(team._id),
        name: team.name,
        slug: team.slug ?? '',
        description: team.description ?? '',
    }) satisfies Team;

/**
 * Hook para obtener todos los equipos
 * Los admins ven todos los equipos, los usuarios solo los suyos
 */
export function useTeams() {
    return useQuery({
        ...convexQuery(api.teams.getTeams, {}),
        select: data => {
            // Handle both array and paginated response formats
            const teams = Array.isArray(data) ? data : [];
            return teams.map(team => normalizeTeam(team as OrganizationDoc));
        },
    });
}

/**
 * Hook para obtener un equipo por su ID
 */
export function useTeam(teamId: string | null) {
    return useQuery({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...convexQuery(api.teams.getTeamById, teamId ? { _id: teamId as any } : 'skip'),
        select: data => (data ? normalizeTeam(data as OrganizationDoc) : null),
    });
}

/**
 * Hook para crear un nuevo equipo
 * Los equipos se crean vacíos - el admin invita miembros después
 */
export function useCreateTeam() {
    const queryClient = useQueryClient();
    const mutationFn = useConvexMutation(api.teams.createTeam);

    return useMutation({
        mutationFn: async (values: CreateTeamParams | CreateTeam) => {
            return await mutationFn({
                name: values.name,
                description: values.description,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
            });
        },
    });
}

/**
 * Hook para actualizar un equipo
 */
export function useUpdateTeam() {
    const queryClient = useQueryClient();
    const mutationFn = useConvexMutation(api.teams.updateTeam);

    return useMutation({
        mutationFn: async (values: UpdateTeamParams | Team) => {
            return await mutationFn({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                _id: values.id as any,
                name: values.name,
                description: values.description,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
            });
        },
    });
}

/**
 * Hook para eliminar un equipo
 */
export function useDeleteTeam() {
    const queryClient = useQueryClient();
    const mutationFn = useConvexMutation(api.teams.deleteTeam);

    return useMutation({
        mutationFn: async (values: { id: string }) => {
            return await mutationFn({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                _id: values.id as any,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
            });
        },
    });
}
