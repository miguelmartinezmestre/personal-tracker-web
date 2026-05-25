'use client';

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth/client';
import { OrganizationRole } from '../types/roles';
import { api } from '@/convex/_generated/api';
import { convexQuery } from '@convex-dev/react-query';
import type { Id } from '@/convex/_generated/dataModel';
import { invalidateConvexQueryWhere } from '@/platform/convex/query-keys';

export interface CreateOrganizationMemberParams {
    organizationId: string;
    email: string;
    role: OrganizationRole;
}

export interface UpdateOrganizationMemberParams {
    memberId: string;
    organizationId?: string;
    role: 'owner' | 'admin' | 'member';
}

export interface DeleteOrganizationMemberParams {
    memberId: string;
    organizationId?: string;
}

const organizationMembersQuery = (organizationId: Id<'organization'>) =>
    convexQuery(api.organizations.getOrganizationMembers, {
        organizationId,
        paginationOpts: { numItems: 20, cursor: null },
    });

function invalidateOrganizationMembers(queryClient: QueryClient, organizationId: string | null) {
    if (!organizationId) return;

    invalidateConvexQueryWhere(
        queryClient,
        organizationMembersQuery(organizationId as Id<'organization'>),
        args => args.organizationId === organizationId
    );
}

export function useCreateOrganizationMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateOrganizationMemberParams) => {
            return await authClient.organization.inviteMember({
                email: values.email,
                role: values.role,
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            invalidateOrganizationMembers(queryClient, variables.organizationId);
        },
    });
}

export function useUpdateOrganizationMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: UpdateOrganizationMemberParams) => {
            return await authClient.organization.updateMemberRole({
                memberId: values.memberId,
                role: values.role,
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            invalidateOrganizationMembers(queryClient, variables.organizationId ?? null);
        },
    });
}

export function useDeleteOrganizationMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: DeleteOrganizationMemberParams) => {
            return await authClient.organization.removeMember({
                memberIdOrEmail: values.memberId,
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            invalidateOrganizationMembers(queryClient, variables.organizationId ?? null);
        },
    });
}
