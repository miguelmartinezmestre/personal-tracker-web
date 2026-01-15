'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth/auth-client';
import type {
    CreateOrganization,
    Organization,
} from '@/features/organizations/schemas/organization';

/**
 * Tipos para las operaciones de organizaciones
 */
export interface CreateOrganizationParams {
    name: string;
    description: string;
}

export interface UpdateOrganizationParams {
    id: string;
    name: string;
    description: string;
}

const ORGANIZATIONS_QUERY_KEY = ['organizations'];

// Organization type from BetterAuth
type Organization = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    logo?: string | null;
    createdAt?: Date | number;
};

const normalizeOrganization = (org: Organization): Organization => {
    // Ensure we're using the actual ID, not the slug
    const organizationId = String(org.id);
    const organizationSlug = org.slug ?? '';

    return {
        id: organizationId,
        name: org.name,
        slug: organizationSlug,
        description: org.description ?? '',
    };
};

/**
 * Hook para obtener todas las organizaciones
 * Usa BetterAuth directamente
 */
export function useOrganizations() {
    return useQuery({
        queryKey: ORGANIZATIONS_QUERY_KEY,
        queryFn: async () => {
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? (result.data as unknown as Organization[])
                    : [];
            const normalized = organizations.map(normalizeOrganization);
            return normalized;
        },
    });
}

/**
 * Hook para obtener una organización por su ID
 */
export function useOrganization(organizationId: string | null) {
    return useQuery({
        queryKey: ORGANIZATIONS_QUERY_KEY.concat(organizationId ?? 'null'),
        queryFn: async () => {
            if (!organizationId) return null;
            // BetterAuth doesn't have a get method, we can use list and filter
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? (result.data as unknown as Organization[])
                    : [];
            const org = organizations.find(o => o.id === organizationId);
            return org ? normalizeOrganization(org) : null;
        },
        enabled: !!organizationId,
    });
}

/**
 * Hook para obtener una organización por su slug
 */
export function useOrganizationBySlug(slug: string | null) {
    return useQuery({
        queryKey: ORGANIZATIONS_QUERY_KEY.concat('slug', slug ?? 'null'),
        queryFn: async () => {
            if (!slug) return null;
            // Fetch all organizations and find by slug
            const result = await authClient.organization.list();
            const organizations =
                result && typeof result === 'object' && 'data' in result
                    ? (result.data as unknown as Organization[])
                    : [];
            const org = organizations.find(o => o.slug === slug);
            return org ? normalizeOrganization(org) : null;
        },
        enabled: !!slug,
    });
}

/**
 * Hook para obtener una organización por slug o ID
 * Intenta buscar primero por slug, y si no encuentra, busca por ID
 * Esto permite que las rutas funcionen tanto con slugs como con IDs
 */
export function useOrganizationByIdentifier(identifier: string | null) {
    return useQuery({
        queryKey: ORGANIZATIONS_QUERY_KEY.concat('identifier', identifier ?? 'null'),
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

            return org ? normalizeOrganization(org) : null;
        },
        enabled: !!identifier,
    });
}

/**
 * Hook para crear una nueva organización
 * Usa BetterAuth directamente
 */
export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateOrganizationParams | CreateOrganization) => {
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
                queryKey: ORGANIZATIONS_QUERY_KEY,
            });
        },
    });
}

/**
 * Hook para actualizar una organización
 */
export function useUpdateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: UpdateOrganizationParams | Organization) => {
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
                queryKey: ORGANIZATIONS_QUERY_KEY,
            });
        },
    });
}

/**
 * Hook para eliminar una organización
 */
export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: { id: string }) => {
            return await authClient.organization.delete({
                organizationId: values.id,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ORGANIZATIONS_QUERY_KEY,
            });
        },
    });
}
