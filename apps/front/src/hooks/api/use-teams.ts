'use client';

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
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

const TEAMS_QUERY_KEY = ['organizations'];

const slugify = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'team';
};

const normalizeTeam = (team: {
    id: string;
    name: string;
    slug?: string;
    description?: string | null;
}) =>
    ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description ?? '',
    }) satisfies Team;

const ensureUniqueSlug = async (name: string) => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (counter < 100) {
        try {
            const result = await authClient.organization.checkSlug({ slug });
            if (result && typeof result === 'object' && 'data' in result && result.data?.status) {
                return slug;
            }
        } catch {
            // Slug ocupado u otro error: intentar con el siguiente
        }
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }

    return slug;
};

/**
 * Hook para obtener todos los equipos del usuario actual
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeams() {
    return useSuspenseQuery({
        queryKey: TEAMS_QUERY_KEY,
        queryFn: async () => {
            const result = await authClient.organization.list();
            const teams =
                result && typeof result === 'object' && 'data' in result ? result.data : [];
            return (teams ?? []).map(normalizeTeam);
        },
    });
}

/**
 * Hook para obtener un equipo por su ID
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeam(teamId: string | null) {
    return useQuery({
        queryKey: ['organization', teamId],
        enabled: !!teamId,
        queryFn: async () => {
            if (!teamId) return null;
            const result = await authClient.organization.list();
            const teams =
                result && typeof result === 'object' && 'data' in result ? result.data : [];
            const team = (teams ?? []).find(t => t.id === teamId);
            return team ? normalizeTeam(team) : null;
        },
    });
}

/**
 * Hook para crear un nuevo equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateTeamParams | CreateTeam) => {
            const slug = await ensureUniqueSlug(values.name);
            return await authClient.organization.create({
                name: values.name,
                slug,
                description: values.description,
            });
        },
        onSuccess: () => {
            // Invalidar la query de equipos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
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
        mutationFn: async (values: UpdateTeamParams | Team) => {
            return await authClient.organization.update({
                organizationId: values.id,
                data: {
                    name: values.name,
                    description: values.description,
                },
            });
        },
        onSuccess: () => {
            // Invalidar las queries relacionadas
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
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
        mutationFn: async (values: { id: string }) => {
            return await authClient.organization.delete({
                organizationId: values.id,
            });
        },
        onSuccess: () => {
            // Invalidar la query de equipos para refrescar la lista
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
            });
        },
    });
}
