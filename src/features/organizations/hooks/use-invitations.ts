'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/auth-client';
import { convexQuery } from '@convex-dev/react-query';

const INVITATIONS_QUERY_KEY = ['user-invitations'];

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

export function usePendingInvitations() {
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getUserInvitations, {})
    );

    const invitations: Invitation[] | undefined = data?.map((inv: InvitationRaw) => {
        const validRoles: InvitationRole[] = ['owner', 'admin', 'member'];
        const role = validRoles.includes(inv.role as InvitationRole)
            ? (inv.role as InvitationRole)
            : 'member';

        const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
        const status = validStatuses.includes(inv.status as typeof validStatuses[number])
            ? (inv.status as typeof validStatuses[number])
            : 'pending';

        return {
            id: inv.id,
            email: inv.email,
            role,
            organizationId: inv.organizationId,
            status,
            createdAt: new Date(inv.createdAt),
            expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : undefined,
            organization: inv.organization,
            inviter: inv.inviter,
        };
    });

    return {
        data: invitations ?? [],
        isPending: isPending,
        isLoading: isLoading,
    };
}

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

