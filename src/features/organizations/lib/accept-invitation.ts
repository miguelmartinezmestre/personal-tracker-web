import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';

type AcceptInvitationAndActivateParams = {
    invitationId: string;
    organizationId?: string;
};

type InvitationAcceptance = {
    status: 'acceptedAndActivated' | 'acceptedActivationPending';
    organizationId: string;
};

type AcceptInvitationPayload = {
    invitation?: { organizationId?: string | null } | null;
    member?: { organizationId?: string | null } | null;
};

export function resolveOrganizationIdAfterAccept(
    payload: AcceptInvitationPayload | null | undefined,
    knownOrganizationId?: string | null
): string {
    const organizationId =
        knownOrganizationId ??
        payload?.member?.organizationId ??
        payload?.invitation?.organizationId ??
        null;

    if (!organizationId) {
        throw new Error('Missing organization id after accepting invitation');
    }

    return organizationId;
}

export async function activateAcceptedOrganization(organizationId: string): Promise<void> {
    const result = await authClient.organization.setActive({ organizationId });
    throwIfAuthClientError(result);
    const session = await authClient.getSession({ query: { disableCookieCache: true } });
    throwIfAuthClientError(session);
}

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
        return { status: 'acceptedAndActivated', organizationId };
    } catch {
        return {
            status: 'acceptedActivationPending',
            organizationId,
        };
    }
}
