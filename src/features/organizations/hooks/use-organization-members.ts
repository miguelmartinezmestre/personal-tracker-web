'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth/auth-client';
import { OrganizationRole } from '../types/roles';

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

const ORGANIZATION_MEMBERS_QUERY_KEY = (organizationId: string | null) => [
    'organization-members',
    organizationId,
];

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
            queryClient.invalidateQueries({
                queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(variables.organizationId),
            });
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
            queryClient.invalidateQueries({
                queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(variables.organizationId ?? null),
            });
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
            queryClient.invalidateQueries({
                queryKey: ORGANIZATION_MEMBERS_QUERY_KEY(variables.organizationId ?? null),
            });
        },
    });
}
