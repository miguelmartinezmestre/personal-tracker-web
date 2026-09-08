'use client';

import { useConvexPages } from '@/hooks/use-convex-pages';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { convexQuery } from '@convex-dev/react-query';
import { useReferenceNow } from '@/lib/reference-now';
import { isOrganizationRoleValue } from '@/features/organizations/types/roles';
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

export type InvitationStatus = Invitation['status'];

function parseInvitationStatus(status: string): InvitationStatus {
    if (
        status === 'pending' ||
        status === 'accepted' ||
        status === 'rejected' ||
        status === 'cancelled'
    ) {
        return status;
    }
    return 'pending';
}

export function usePendingInvitations() {
    const referenceNow = useReferenceNow();
    const result = useConvexPages<InvitationRaw>(
        'userInvitations',
        cursor =>
            convexQuery(api.organizations.getUserInvitationsPage, {
                now: referenceNow,
                paginationOpts: { numItems: 50, cursor },
            }),
        invitation => invitation.id
    );
    const { data } = result;

    const invitations: Invitation[] | undefined = data?.map((rawInvitation: InvitationRaw) => {
        const role = isOrganizationRoleValue(rawInvitation.role) ? rawInvitation.role : 'member';
        const status = parseInvitationStatus(rawInvitation.status);

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

    return { ...result, data: invitations ?? [] };
}

export function useAcceptInvitation() {
    const router = useRouter();

    return useMutation({
        mutationFn: async (params: { invitationId: string; organizationId: string }) => {
            return await acceptInvitationAndActivateOrganization(params);
        },
        onSuccess: result => {
            if (result.status === 'acceptedAndActivated') {
                router.refresh();
            }
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
