'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/auth-client';
import { convexQuery } from '@convex-dev/react-query';

const INVITATIONS_QUERY_KEY = ['user-invitations'];

/**
 * Invitation types based on BetterAuth organization plugin
 */
export type InvitationRole = 'owner' | 'admin' | 'member';

interface InvitationRaw {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  status: string;
  createdAt: number;
  expiresAt?: number;
  organization?: { id: string; name: string; slug: string };
  inviter?: { id: string; name: string; email: string };
}

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Hook to get pending invitations for the current user
 */
export function usePendingInvitations() {
  const { data, isPending, isLoading } = useQuery(
    convexQuery(api.organizations.getUserInvitations, {})
  );

  const invitations = data?.map((inv: InvitationRaw) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as InvitationRole,
    organizationId: inv.organizationId,
    status: inv.status as 'pending' | 'accepted' | 'rejected' | 'cancelled',
    createdAt: new Date(inv.createdAt),
    expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : undefined,
    organization: inv.organization,
    inviter: inv.inviter,
  })) as Invitation[] | undefined;

  return {
    data: invitations ?? [],
    isPending: isPending,
    isLoading: isLoading,
  };
}

/**
 * Hook to send an invitation to a user
 * Uses BetterAuth's inviteMember under the hood
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      email: string;
      organizationId: string;
      role?: InvitationRole;
    }) => {
      return await authClient.organization.inviteMember({
        email: params.email,
        role: params.role ?? 'member',
        organizationId: params.organizationId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-invitations', variables.organizationId],
      });
    },
  });
}

/**
 * Hook to accept a pending invitation
 * Uses BetterAuth's acceptInvitation under the hood
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      return await authClient.organization.acceptInvitation({
        invitationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
    },
  });
}

/**
 * Hook to reject a pending invitation
 * Uses BetterAuth's rejectInvitation under the hood
 */
export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      return await authClient.organization.rejectInvitation({
        invitationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to list invitations for a specific organization
 */
export function useOrganizationInvitations(organizationId: string | null) {
  const { data, isPending, isLoading } = useQuery(
    convexQuery(
      api.organizations.getOrganizationInvitations,
      organizationId ? { organizationId } : 'skip'
    )
  );

  const invitations = data?.map((inv: InvitationRaw) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as InvitationRole,
    organizationId: inv.organizationId,
    status: inv.status as 'pending' | 'accepted' | 'rejected' | 'cancelled',
    createdAt: new Date(inv.createdAt),
    expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : undefined,
    inviter: inv.inviter,
  })) as Invitation[] | undefined;

  return {
    data: invitations ?? [],
    isPending: isPending,
    isLoading: isLoading,
  };
}

/**
 * Hook to cancel a pending invitation (for the inviter)
 * Uses BetterAuth's cancelInvitation endpoint.
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      return await authClient.organization.cancelInvitation({
        invitationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-invitations'],
      });
    },
  });
}
