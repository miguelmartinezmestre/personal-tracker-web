'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/auth-client';
import type {
    CreateOrganization,
    Organization,
} from '@/features/organizations/schemas/organization';
import { convexQuery } from '@convex-dev/react-query';

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

const ORGANIZATIONS_QUERY = convexQuery(api.organizations.getOrganizationsByUser, {});
const ORGANIZATIONS_QUERY_KEY = ORGANIZATIONS_QUERY.queryKey;

interface OrganizationRaw {
    id: string;
    name: string;
    slug: string;
    description?: string;
}

/**
 * Hook para obtener todas las organizaciones del usuario
 */
export function useOrganizations() {
    const { data, isPending, isLoading } = useQuery(ORGANIZATIONS_QUERY);

    return {
        data: data?.map((org: OrganizationRaw) => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            description: org.description ?? '',
        })) as Organization[] | undefined,
        isPending: isPending,
        isLoading: isLoading,
    };
}

/**
 * Hook para obtener una organización por slug o ID
 * Intenta buscar primero por slug, y si no encuentra, busca por ID
 * Esto permite que las rutas funcionen tanto con slugs como con IDs
 */
export function useOrganizationByIdentifier(identifier: string | null) {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getOrganizationsByUser, identifier ? {} : 'skip')
    );

    // First try to find by slug
    let org = data?.find((o: OrganizationRaw) => {
        const slug = o.slug;
        if (!slug) return false;
        return slug.trim() === identifier!.trim();
    });

    // If not found by slug, try by ID
    if (!org) {
        org = data?.find((o: OrganizationRaw) => o.id.trim() === identifier!.trim());
    }

    return {
        data: org
            ? ({
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  description: org.description ?? '',
              } as Organization)
            : null,
        isPending: isPending,
        isLoading: isLoading,
    };
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
                    description: values.description ?? undefined,
                },
                organizationId: values.id,
            });
        },
        onMutate: async values => {
            await queryClient.cancelQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<Organization[]>(ORGANIZATIONS_QUERY_KEY);

            if (previous) {
                queryClient.setQueryData<Organization[]>(ORGANIZATIONS_QUERY_KEY, old =>
                    old?.map(org =>
                        org.id === values.id
                            ? {
                                  ...org,
                                  name: values.name,
                                  description: values.description ?? '',
                              }
                            : org
                    )
                );
            }

            return { previous };
        },
        onError: (_error, _values, context) => {
            if (context?.previous) {
                queryClient.setQueryData(ORGANIZATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
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
        onMutate: async values => {
            await queryClient.cancelQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
            const previous = queryClient.getQueryData<Organization[]>(ORGANIZATIONS_QUERY_KEY);

            if (previous) {
                queryClient.setQueryData<Organization[]>(ORGANIZATIONS_QUERY_KEY, old =>
                    old?.filter(org => org.id !== values.id)
                );
            }

            return { previous };
        },
        onError: (_error, _values, context) => {
            if (context?.previous) {
                queryClient.setQueryData(ORGANIZATIONS_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ORGANIZATIONS_QUERY_KEY,
            });
        },
    });
}
