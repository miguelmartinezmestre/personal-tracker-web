'use client';

import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/features/auth/client';
import { type OrganizationRoleValue } from '@/features/organizations/types/roles';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';

export interface CreateOrganizationMemberParams {
    organizationId: string;
    email: string;
    role: OrganizationRoleValue;
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

export function useCreateOrganizationMember() {
    return useMutation({
        mutationFn: async (values: CreateOrganizationMemberParams) => {
            const result = await authClient.organization.inviteMember({
                email: values.email,
                role: values.role,
                organizationId: values.organizationId,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}

export function useUpdateOrganizationMember() {
    return useMutation({
        mutationFn: async (values: UpdateOrganizationMemberParams) => {
            const result = await authClient.organization.updateMemberRole({
                memberId: values.memberId,
                role: values.role,
                organizationId: values.organizationId,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}

export function useDeleteOrganizationMember() {
    return useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: async (values: DeleteOrganizationMemberParams) => {
            const result = await authClient.organization.removeMember({
                memberIdOrEmail: values.memberId,
                organizationId: values.organizationId,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}
