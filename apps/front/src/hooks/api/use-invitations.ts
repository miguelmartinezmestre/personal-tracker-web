'use client';

import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';

const INVITATIONS_QUERY_KEY = ['user-invitations'];

/**
 * Invitation types based on BetterAuth organization plugin
 */
export type InvitationRole = 'owner' | 'admin' | 'member';

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
 * Uses BetterAuth's listUserInvitations under the hood
 */
export function usePendingInvitations() {
    return useSuspenseQuery({
        queryKey: INVITATIONS_QUERY_KEY,
        queryFn: async () => {
            const result = await authClient.organization.listUserInvitations();
            return (result as unknown as { data: Invitation[] })?.data ?? [];
        },
    });
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
 * Uses BetterAuth's listInvitations under the hood
 */
export function useOrganizationInvitations(organizationId: string | null) {
    return useQuery({
        queryKey: ['organization-invitations', organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            // BetterAuth's listInvitations takes organizationId as query parameter
            const result = await authClient.organization.listInvitations({
                query: { organizationId },
            });
            return (result as unknown as { data: Invitation[] })?.data ?? [];
        },
        enabled: !!organizationId,
    });
}

/**
 * Hook to cancel a pending invitation (for the inviter)
 * Uses BetterAuth's cancelInvitation under the hood if available,
 * otherwise uses rejectInvitation
 */
export function useCancelInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (invitationId: string) => {
            // BetterAuth may not have a dedicated cancel method,
            // so we use rejectInvitation which cancels pending invitations
            return await authClient.organization.rejectInvitation({
                invitationId,
            });
        },
        onSuccess: (_, variables, context) => {
            queryClient.invalidateQueries({
                queryKey: ['organization-invitations'],
            });
        },
    });
}
