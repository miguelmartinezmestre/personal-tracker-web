'use client';

import { useConvexPages } from '@/hooks/use-convex-pages';
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
    isOrganizationRoleValue,
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
    if (isOrganizationRoleValue(role)) {
        return role;
    }
    return 'member';
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
    const result = useConvexPages<OrganizationRaw>(
        'organizations',
        cursor =>
            convexQuery(api.organizations.getOrganizationsPage, {
                paginationOpts: { cursor, numItems: 50 },
            }),
        organization => organization.id
    );
    return { ...result, data: result.data?.map(mapOrganization) };
}

export function useOrganizationByIdentifier(identifier: string) {
    const query = useQuery(
        convexQuery(
            api.organizations.getOrganizationByIdentifier,
            identifier ? { identifier } : 'skip'
        )
    );
    return { ...query, data: query.data ? mapOrganization(query.data) : null };
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
                    metadata: { description: values.description },
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
