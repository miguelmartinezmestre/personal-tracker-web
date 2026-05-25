'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import type {
    CreateOrganization,
    Organization,
} from '@/features/organizations/schemas/organization';
import { convexQuery } from '@convex-dev/react-query';

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

export function useOrganizations() {
    const { data, isPending, isLoading } = useQuery(ORGANIZATIONS_QUERY);

    const organizations: Organization[] | undefined = data?.map((org: OrganizationRaw) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description ?? '',
    }));

    return {
        data: organizations,
        isPending: isPending,
        isLoading: isLoading,
    };
}

export function useOrganizationByIdentifier(identifier: string | null) {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getOrganizationsByUser, identifier ? {} : 'skip')
    );

    if (!identifier) {
        return { data: null, isPending, isLoading };
    }

    const trimmedIdentifier = identifier.trim();

    let org = data?.find((o: OrganizationRaw) => {
        const slug = o.slug;
        if (!slug) return false;
        return slug.trim() === trimmedIdentifier;
    });

    if (!org) {
        org = data?.find((o: OrganizationRaw) => o.id.trim() === trimmedIdentifier);
    }

    const organization: Organization | null = org
        ? {
              id: org.id,
              name: org.name,
              slug: org.slug,
              description: org.description ?? '',
          }
        : null;

    return {
        data: organization,
        isPending: isPending,
        isLoading: isLoading,
    };
}

export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateOrganizationParams | CreateOrganization) => {
            return await authClient.organization.create({
                name: values.name,
                description: values.description,
                logo: '',
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
