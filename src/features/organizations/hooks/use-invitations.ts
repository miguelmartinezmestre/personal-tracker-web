'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { convexQuery } from '@convex-dev/react-query';
import { useReferenceNow } from '@/lib/reference-now';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { acceptInvitationAndActivateOrganization } from '@/features/organizations/lib/accept-invitation';

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
    const referenceNow = useReferenceNow();
    const { data, isPending, isLoading } = useQuery(
        convexQuery(api.organizations.getUserInvitations, { now: referenceNow })
    );

    const invitations: Invitation[] | undefined = data?.map((rawInvitation: InvitationRaw) => {
        const validRoles: InvitationRole[] = ['owner', 'admin', 'member'];
        const role = validRoles.includes(rawInvitation.role as InvitationRole)
            ? (rawInvitation.role as InvitationRole)
            : 'member';

        const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
        const status = validStatuses.includes(
            rawInvitation.status as (typeof validStatuses)[number]
        )
            ? (rawInvitation.status as (typeof validStatuses)[number])
            : 'pending';

        return {
            id: rawInvitation.id,
            email: rawInvitation.email,
            role,
            organizationId: rawInvitation.organizationId,
            status,
            createdAt: new Date(rawInvitation.createdAt),
            expiresAt: rawInvitation.expiresAt ? new Date(rawInvitation.expiresAt) : undefined,
            organization: rawInvitation.organization,
            inviter: rawInvitation.inviter,
        };
    });

    return {
        data: invitations ?? [],
        isPending: isPending,
        isLoading: isLoading,
    };
}

export function useAcceptInvitation() {
    const router = useRouter();

    return useMutation({
        mutationFn: async (params: { invitationId: string; organizationId: string }) => {
            return await acceptInvitationAndActivateOrganization(params);
        },
        onSuccess: () => {
            router.refresh();
        },
    });
}

export function useRejectInvitation() {
    return useMutation({
        mutationFn: async (invitationId: string) => {
            const result = await authClient.organization.rejectInvitation({
                invitationId,
            });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}
