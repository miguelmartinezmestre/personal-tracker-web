'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/features/auth/auth-client';
import { OrganizationRole } from '../types/roles';

/**
 * Tipos para las operaciones de miembros de organización
 */
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

/**
 * Hook para crear un nuevo miembro de una organización
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
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

/**
 * Hook para actualizar un miembro de una organización
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
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

/**
 * Hook para eliminar un miembro de una organización
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
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
