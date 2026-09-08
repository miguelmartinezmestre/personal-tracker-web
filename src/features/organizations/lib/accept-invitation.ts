import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { resolveOrganizationIdAfterAccept } from '@shared/accept-invitation';

type AcceptInvitationAndActivateParams = {
    invitationId: string;
    organizationId?: string;
};

export type InvitationAcceptance = {
    status: 'acceptedAndActivated' | 'acceptedActivationPending';
    data: Awaited<ReturnType<typeof authClient.organization.acceptInvitation>>['data'];
    organizationId: string;
};

export async function activateAcceptedOrganization(organizationId: string): Promise<void> {
    const result = await authClient.organization.setActive({ organizationId });
    throwIfAuthClientError(result);
    const session = await authClient.getSession({ query: { disableCookieCache: true } });
    throwIfAuthClientError(session);
}

/**
 * Accept once. Activation and JWT refresh can then be retried independently.
 */
export async function acceptInvitationAndActivateOrganization(
    params: AcceptInvitationAndActivateParams
): Promise<InvitationAcceptance> {
    const acceptResult = await authClient.organization.acceptInvitation({
        invitationId: params.invitationId,
    });
    throwIfAuthClientError(acceptResult);

    const organizationId = resolveOrganizationIdAfterAccept(
        acceptResult.data,
        params.organizationId
    );

    try {
        await activateAcceptedOrganization(organizationId);
        return { status: 'acceptedAndActivated' as const, data: acceptResult.data, organizationId };
    } catch {
        return {
            status: 'acceptedActivationPending' as const,
            data: acceptResult.data,
            organizationId,
        };
    }
}
