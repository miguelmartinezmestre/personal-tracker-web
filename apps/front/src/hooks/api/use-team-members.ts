'use client';

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import type { TeamMember } from '@/schemas/team-member';
import { TeamRole } from '@/schemas/roles';

/**
 * Tipos para las operaciones de miembros de equipo
 */
export interface CreateTeamMemberParams {
    organizationId: string;
    email: string;
    role: 'MANAGER' | 'MEMBER';
}

export interface UpdateTeamMemberParams {
    memberId: string;
    organizationId?: string;
    role: 'MANAGER' | 'MEMBER';
}

export interface DeleteTeamMemberParams {
    memberId: string;
    organizationId?: string;
}

const TEAM_MEMBERS_QUERY_KEY = (teamId: string | null) => ['organization-members', teamId];

const mapTeamRoleToOrganizationRole = (role: TeamRole | 'MANAGER' | 'MEMBER') =>
    role === TeamRole.MANAGER ? 'admin' : 'member';

const mapOrganizationRoleToTeamRole = (role: string) =>
    role === 'owner' || role === 'admin' ? 'MANAGER' : 'MEMBER';

const normalizeMember = (member: {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: { email?: string | null };
}) =>
    ({
        id: member.id,
        organizationId: member.organizationId,
        userId: member.userId,
        email: member.user?.email ?? '',
        role: mapOrganizationRoleToTeamRole(member.role),
        createdAt: member.createdAt,
    }) satisfies TeamMember;

/**
 * Hook para obtener los miembros de un equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useTeamMembers(teamId: string | null) {
    return useSuspenseQuery({
        queryKey: TEAM_MEMBERS_QUERY_KEY(teamId),
        queryFn: async () => {
            if (!teamId) return [];
            const result = await authClient.organization.listMembers({
                query: { organizationId: teamId },
            });
            const payload =
                result && typeof result === 'object' && 'data' in result ? result.data : null;
            return (payload?.members ?? []).map(normalizeMember);
        },
    });
}

/**
 * Hook para crear un nuevo miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useCreateTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: CreateTeamMemberParams) => {
            return await authClient.organization.inviteMember({
                email: values.email,
                role: mapTeamRoleToOrganizationRole(values.role),
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: TEAM_MEMBERS_QUERY_KEY(variables.organizationId),
            });
        },
    });
}

/**
 * Hook para actualizar un miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useUpdateTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: UpdateTeamMemberParams) => {
            return await authClient.organization.updateMemberRole({
                memberId: values.memberId,
                role: mapTeamRoleToOrganizationRole(values.role),
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: TEAM_MEMBERS_QUERY_KEY(variables.organizationId ?? null),
            });
        },
    });
}

/**
 * Hook para eliminar un miembro de equipo
 * Abstrae la implementación de Convex para permitir cambiar de tecnología en el futuro
 */
export function useDeleteTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: DeleteTeamMemberParams) => {
            return await authClient.organization.removeMember({
                memberIdOrEmail: values.memberId,
                organizationId: values.organizationId,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: TEAM_MEMBERS_QUERY_KEY(variables.organizationId ?? null),
            });
        },
    });
}
