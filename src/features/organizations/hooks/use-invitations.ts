'use client';

import { useMutation } from '@tanstack/react-query';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { usePaginatedList } from '@/components/data-table/hooks/use-paginated-list';
import { api } from '@/convex/_generated/api';
import { authClient } from '@/features/auth/client';
import {
    isOrganizationRoleValue,
    type OrganizationRoleValue,
} from '@/features/organizations/types/roles';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { acceptInvitationAndActivateOrganization } from '@/features/organizations/lib/accept-invitation';
import type { FunctionReturnType } from 'convex/server';

type InvitationRaw = FunctionReturnType<
    typeof api.organizations.getUserInvitations
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
    const pagination = usePaginatedList(api.organizations.getUserInvitations, {});
    const invitations: Invitation[] = pagination.data.map(rawInvitation => ({
        id: rawInvitation.id,
        email: rawInvitation.email,
        role: isOrganizationRoleValue(rawInvitation.role) ? rawInvitation.role : 'member',
        organizationId: rawInvitation.organizationId,
        organization: rawInvitation.organization,
        inviter: rawInvitation.inviter ? { name: rawInvitation.inviter.name } : undefined,
    }));

    return { ...pagination, data: invitations };
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

export function usePendingOrganizationInvitations(organizationId: string) {
    return usePaginatedList(api.organizations.getOrganizationPendingInvitations, {
        organizationId: organizationId as Id<'organization'>,
    });
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
