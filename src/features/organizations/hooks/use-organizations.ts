'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import type { CreateOrganization } from '@/features/organizations/schemas/organization';
import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import type { FunctionReturnType } from 'convex/server';
import { buildOrganizationSlug } from '@/convex/features/organizations/slug';
import { DEFAULT_ORGANIZATION_SLUG_BASE } from '@/convex/features/organizations/personalOrganization';

type UpdateOrganization = { id: string; name: string };

export type Organization = FunctionReturnType<
    typeof api.organizations.listOrganizations
>['page'][number];

export function usePersonalOrganizationId() {
    return useQuery(convexQuery(api.organizations.getPersonalOrganizationId, {}));
}

export function usePaginatedOrganizations() {
    return usePaginatedList(api.organizations.listOrganizations, {});
}

export function useOrganizationByIdentifier(identifier: string) {
    return useQuery(
        convexQuery(
            api.organizations.getOrganizationByIdentifier,
            identifier ? { identifier } : 'skip'
        )
    );
}

function buildUniqueOrganizationSlug(name: string): string {
    const slug = `${buildOrganizationSlug(name)}-${crypto.randomUUID().slice(0, 6)}`;

    return slug.startsWith(`${DEFAULT_ORGANIZATION_SLUG_BASE}-`) ? `org-${slug}` : slug;
}

export function useCreateOrganization() {
    const addChosenCategories = useConvexMutation(api.categories.addChosenCategories);

    return useMutation({
        mutationFn: async (values: CreateOrganization) => {
            const result = await authClient.organization.create({
                name: values.name,
                logo: '',
                slug: buildUniqueOrganizationSlug(values.name),
            });

            throwIfAuthClientError(result);

            if (result.data) {
                await addChosenCategories({
                    organizationId: result.data.id as string,
                    categories: values.categories,
                });
            }

            return result.data;
        },
    });
}

export function useUpdateOrganization() {
    return useMutation({
        mutationFn: async (values: UpdateOrganization) => {
            const result = await authClient.organization.update({
                data: { name: values.name },
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

export function useLeaveOrganization() {
    return useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: async (values: { organizationId: string; fallbackOrganizationId?: string }) => {
            if (values.fallbackOrganizationId) {
                const switched = await authClient.organization.setActive({
                    organizationId: values.fallbackOrganizationId,
                });

                throwIfAuthClientError(switched);
            }

            const result = await authClient.organization.leave({
                organizationId: values.organizationId,
            });

            if (result.error && values.fallbackOrganizationId) {
                await authClient.organization.setActive({ organizationId: values.organizationId });
            }

            throwIfAuthClientError(result);

            return result.data;
        },
    });
}
