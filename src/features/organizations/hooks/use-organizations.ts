'use client';

import { useMutation } from '@tanstack/react-query';
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

interface OrganizationRaw {
    id: string;
    name: string;
    slug: string;
    description?: string;
}

export function useOrganizations() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getOrganizationsByUser, {})
    );

    const organizations: Organization[] | undefined = data?.map(
        (rawOrganization: OrganizationRaw) => ({
            id: rawOrganization.id,
            name: rawOrganization.name,
            slug: rawOrganization.slug,
            description: rawOrganization.description ?? '',
        })
    );

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

    let matchedOrganization = data?.find((organization: OrganizationRaw) => {
        const slug = organization.slug;
        if (!slug) return false;
        return slug.trim() === trimmedIdentifier;
    });

    if (!matchedOrganization) {
        matchedOrganization = data?.find(
            (organization: OrganizationRaw) => organization.id.trim() === trimmedIdentifier
        );
    }

    const organization: Organization | null = matchedOrganization
        ? {
              id: matchedOrganization.id,
              name: matchedOrganization.name,
              slug: matchedOrganization.slug,
              description: matchedOrganization.description ?? '',
          }
        : null;

    return {
        data: organization,
        isPending: isPending,
        isLoading: isLoading,
    };
}

export function useCreateOrganization() {
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
    });
}

export function useUpdateOrganization() {
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
    });
}

export function useDeleteOrganization() {
    return useMutation({
        mutationFn: async (values: { id: string }) => {
            return await authClient.organization.delete({
                organizationId: values.id,
            });
        },
    });
}
