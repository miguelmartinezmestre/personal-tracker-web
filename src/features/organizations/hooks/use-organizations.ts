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
import {
    ORGANIZATION_ROLES,
    type OrganizationRoleValue,
} from '@/features/organizations/types/roles';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { buildOrganizationSlug } from '@shared/organization-slug';

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
    isPersonal?: boolean;
    role: string;
}

function normalizeOrganizationRole(role: string): OrganizationRoleValue {
    return ORGANIZATION_ROLES.includes(role as OrganizationRoleValue)
        ? (role as OrganizationRoleValue)
        : 'member';
}

function mapOrganization(rawOrganization: OrganizationRaw): Organization {
    return {
        id: rawOrganization.id,
        name: rawOrganization.name,
        slug: rawOrganization.slug,
        description: rawOrganization.description ?? '',
        isPersonal: rawOrganization.isPersonal ?? false,
        role: normalizeOrganizationRole(rawOrganization.role),
    };
}

export function useOrganizations() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getOrganizationsByUser, {})
    );

    const organizations: Organization[] | undefined = data?.map(mapOrganization);

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
        ? mapOrganization(matchedOrganization)
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
            const result = await authClient.organization.create({
                name: values.name,
                logo: '',
                metadata: values.description ? { description: values.description } : undefined,
                slug: buildOrganizationSlug(values.name),
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}

export function useUpdateOrganization() {
    return useMutation({
        mutationFn: async (values: UpdateOrganizationParams | Organization) => {
            const result = await authClient.organization.update({
                data: {
                    name: values.name,
                    metadata: { description: values.description ?? '' },
                },
                organizationId: values.id,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}

export function useDeleteOrganization() {
    return useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: async (values: { id: string }) => {
            const result = await authClient.organization.delete({
                organizationId: values.id,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}
