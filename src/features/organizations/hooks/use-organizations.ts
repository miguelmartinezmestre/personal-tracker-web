'use client';

import { useConvexPages } from '@/hooks/use-convex-pages';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import type { CreateOrganization } from '@/features/organizations/schemas/organization';
import { convexQuery } from '@convex-dev/react-query';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import type { FunctionReturnType } from 'convex/server';
import { buildOrganizationSlug } from '@/convex/utils';

type UpdateOrganization = CreateOrganization & { id: string };

export type Organization = FunctionReturnType<
    typeof api.organizations.getOrganizationsPage
>['page'][number];

export function useOrganizations() {
    return useConvexPages<Organization>(
        'organizations',
        cursor =>
            convexQuery(api.organizations.getOrganizationsPage, {
                paginationOpts: { cursor, numItems: 50 },
            }),
        organization => organization.id
    );
}

export function useOrganizationByIdentifier(identifier: string) {
    return useQuery(
        convexQuery(
            api.organizations.getOrganizationByIdentifier,
            identifier ? { identifier } : 'skip'
        )
    );
}

export function useCreateOrganization() {
    return useMutation({
        mutationFn: async (values: CreateOrganization) => {
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
        mutationFn: async (values: UpdateOrganization) => {
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
