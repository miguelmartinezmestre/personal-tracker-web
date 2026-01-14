'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const TEAMS_QUERY_KEY = ['teams'];

// Organization type from BetterAuth
type Organization = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    logo?: string | null;
    createdAt?: Date | number;
};

const normalizeTeam = (org: Organization): Team => {
    // Ensure we're using the actual ID, not the slug
    const teamId = String(org.id);
    const teamSlug = org.slug ?? '';
    
    return {
        id: teamId,
        name: org.name,
        slug: teamSlug,
        description: org.description ?? '',
    };
};

/**
 * Hook para obtener todos los equipos (organizaciones)
 * Usa BetterAuth directamente
 */
export function useTeams() {
    return useQuery({
        queryKey: TEAMS_QUERY_KEY,
        queryFn: async () => {
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? ((result.data as unknown) as Organization[])
                    : [];
            const normalized = organizations.map(normalizeTeam);
            return normalized;
        },
    });
}

/**
 * Hook para obtener un equipo por su ID
 */
export function useTeam(teamId: string | null) {
    return useQuery({
        queryKey: TEAMS_QUERY_KEY.concat(teamId ?? 'null'),
        queryFn: async () => {
            if (!teamId) return null;
            // BetterAuth doesn't have a get method, we can use list and filter
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? ((result.data as unknown) as Organization[])
                    : [];
            const org = organizations.find(o => o.id === teamId);
            return org ? normalizeTeam(org) : null;
        },
        enabled: !!teamId,
    });
}

/**
 * Hook para obtener un equipo por su slug
 */
export function useTeamBySlug(slug: string | null) {
    return useQuery({
        queryKey: TEAMS_QUERY_KEY.concat('slug', slug ?? 'null'),
        queryFn: async () => {
            if (!slug) return null;
            // Fetch all organizations and find by slug
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? ((result.data as unknown) as Organization[])
                    : [];
            const org = organizations.find(o => o.slug === slug);
            return org ? normalizeTeam(org) : null;
        },
        enabled: !!slug,
    });
}

/**
 * Hook para obtener un equipo por slug o ID
 * Intenta buscar primero por slug, y si no encuentra, busca por ID
 * Esto permite que las rutas funcionen tanto con slugs como con IDs
 */
export function useTeamByIdentifier(identifier: string | null) {
    return useQuery({
        queryKey: TEAMS_QUERY_KEY.concat('identifier', identifier ?? 'null'),
        queryFn: async () => {
            if (!identifier) return null;
            // Fetch all organizations
            const result = await authClient.organization.list();
            
            // Handle different response structures
            let organizations: Organization[] = [];
            if (Array.isArray(result)) {
                // Direct array response
                organizations = result as unknown as Organization[];
            } else if (result && typeof result === 'object') {
                // Object with data property
                if ('data' in result && Array.isArray(result.data)) {
                    organizations = result.data as unknown as Organization[];
                } else if ('organizations' in result && Array.isArray(result.organizations)) {
                    organizations = result.organizations as unknown as Organization[];
                }
            }
            
            // First try to find by slug (handle null/undefined cases)
            let org = organizations.find(o => {
                const slug = o.slug;
                // Compare slug, handling null/undefined/empty string cases
                if (slug === null || slug === undefined || slug === '') return false;
                const slugStr = String(slug).trim();
                const identifierStr = String(identifier).trim();
                return slugStr === identifierStr;
            });
            
            
            // If not found by slug, try to find by ID
            if (!org) {
                org = organizations.find(o => String(o.id).trim() === String(identifier).trim());
            }
            
            return org ? normalizeTeam(org) : null;
        },
        enabled: !!identifier,
    });
}

/**
 * Hook para crear un nuevo equipo
 * Usa BetterAuth directamente
 */
export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateTeamParams | CreateTeam) => {
            return await authClient.organization.create({
                name: values.name,
                description: values.description,
                // BetterAuth generará el slug automáticamente si no se proporciona
                slug: values.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, ''),
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

    return useMutation({
        mutationFn: async (values: UpdateTeamParams | Team) => {
            return await authClient.organization.update({
                data: {
                    name: values.name,
                    description: values.description,
                },
                organizationId: values.id,
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

    return useMutation({
        mutationFn: async (values: { id: string }) => {
            return await authClient.organization.delete({
                organizationId: values.id,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TEAMS_QUERY_KEY,
            });
        },
    });
}
