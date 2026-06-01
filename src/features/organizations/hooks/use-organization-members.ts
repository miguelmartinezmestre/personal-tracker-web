'use client';

import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/features/auth/client';
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

export function useCreateOrganizationMember() {
    return useMutation({
        mutationFn: async (values: CreateOrganizationMemberParams) => {
            return await authClient.organization.inviteMember({
                email: values.email,
                role: values.role,
                organizationId: values.organizationId,
            });
        },
    });
}

export function useUpdateOrganizationMember() {
    return useMutation({
        mutationFn: async (values: UpdateOrganizationMemberParams) => {
            return await authClient.organization.updateMemberRole({
                memberId: values.memberId,
                role: values.role,
                organizationId: values.organizationId,
            });
        },
    });
}

export function useDeleteOrganizationMember() {
    return useMutation({
        mutationFn: async (values: DeleteOrganizationMemberParams) => {
            return await authClient.organization.removeMember({
                memberIdOrEmail: values.memberId,
                organizationId: values.organizationId,
            });
        },
    });
}
