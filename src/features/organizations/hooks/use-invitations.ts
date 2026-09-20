'use client';

import { useConvexPages } from '@/hooks/use-convex-pages';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { convexQuery } from '@convex-dev/react-query';
import { useReferenceNow } from '@/lib/reference-now';
import {
    isOrganizationRoleValue,
    type OrganizationRoleValue,
} from '@/features/organizations/types/roles';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { acceptInvitationAndActivateOrganization } from '@/features/organizations/lib/accept-invitation';
import type { FunctionReturnType } from 'convex/server';

type InvitationRaw = FunctionReturnType<
    typeof api.organizations.getUserInvitationsPage
>['page'][number];

export interface Invitation {
    id: InvitationRaw['id'];
    email: string;
    role: OrganizationRoleValue;
    organizationId: InvitationRaw['organizationId'];
    organization?: { name: string };
    inviter?: { name: string };
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

    const invitations: Invitation[] | undefined = data?.map(rawInvitation => ({
        id: rawInvitation.id,
        email: rawInvitation.email,
        role: isOrganizationRoleValue(rawInvitation.role) ? rawInvitation.role : 'member',
        organizationId: rawInvitation.organizationId,
        organization: rawInvitation.organization
            ? { name: rawInvitation.organization.name }
            : undefined,
        inviter: rawInvitation.inviter ? { name: rawInvitation.inviter.name } : undefined,
    }));

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
