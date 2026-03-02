'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/auth-client';
import type { OrganizationMember } from '@/features/organizations/schemas/organization-member';
import { OrganizationRole } from '../types/roles';
import { convexQuery } from '@convex-dev/react-query';

interface OrganizationMemberRaw {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: number;
  user?: { email?: string } | null;
}

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
 * Hook para obtener los miembros de una organización
 */
export function useOrganizationMembers(organizationId: string | null) {
  const { data, isPending, isLoading } = useQuery(
    convexQuery(
      api.organizations.getOrganizationMembers,
      organizationId ? { organizationId } : 'skip'
    )
  );

  const members = data?.members.map((member: OrganizationMemberRaw) => ({
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    email: member.user?.email ?? '',
    role: member.role as OrganizationRole,
    createdAt: new Date(member.createdAt),
  })) as OrganizationMember[] | undefined;

  return {
    data: members ?? [],
    isPending: isPending,
    isLoading: isLoading,
  };
}

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
