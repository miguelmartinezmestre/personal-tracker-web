'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import { convexQuery } from '@convex-dev/react-query';
import {
    isOrganizationRoleValue,
    type OrganizationRoleValue,
} from '@/features/organizations/types/roles';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { acceptInvitationAndActivateOrganization } from '@/features/organizations/lib/accept-invitation';
import type { FunctionReturnType } from 'convex/server';

type InvitationRaw = FunctionReturnType<typeof api.organizations.getUserInvitations>[number];

export interface Invitation {
    id: InvitationRaw['id'];
    email: string;
    role: OrganizationRoleValue;
    organizationId: InvitationRaw['organizationId'];
    organization?: { name: string };
    inviter?: { name: string };
}

export function usePendingInvitations() {
    const result = useQuery(convexQuery(api.organizations.getUserInvitations, {}));
    const { data } = result;

    let invitations: Invitation[] | undefined;
    if (data) {
        invitations = data.map(rawInvitation => {
            let inviter: Invitation['inviter'];
            if (rawInvitation.inviter) {
                inviter = { name: rawInvitation.inviter.name };
            }
            let role: OrganizationRoleValue = 'member';
            if (isOrganizationRoleValue(rawInvitation.role)) {
                role = rawInvitation.role;
            }
            return {
                id: rawInvitation.id,
                email: rawInvitation.email,
                role,
                organizationId: rawInvitation.organizationId,
                organization: rawInvitation.organization,
                inviter,
            };
        });
    }

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

export function usePendingOrganizationInvitations(organizationId: string, enabled: boolean) {
    return useQuery(
        convexQuery(
            api.organizations.getOrganizationPendingInvitations,
            enabled ? { organizationId: organizationId as Id<'organization'> } : 'skip'
        )
    );
}

export function useCancelInvitation() {
    return useMutation({
        meta: { handlesErrorsLocally: true },
        mutationFn: async (invitationId: string) => {
            const result = await authClient.organization.cancelInvitation({ invitationId });
            throwIfAuthClientError(result);
            return result.data;
        },
    });
}
