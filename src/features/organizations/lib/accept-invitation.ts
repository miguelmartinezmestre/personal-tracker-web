import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';
import { resolveOrganizationIdAfterAccept } from '@shared/accept-invitation';

type AcceptInvitationAndActivateParams = {
    invitationId: string;
    organizationId?: string;
};

/**
 * Accept an organization invitation and auto-switch the session to that org.
 * Better Auth also patches activeOrganizationId server-side; calling setActive
 * refreshes the client session/JWT so Convex RLS sees the invited tenant.
 */
export async function acceptInvitationAndActivateOrganization(
    params: AcceptInvitationAndActivateParams
) {
    const acceptResult = await authClient.organization.acceptInvitation({
        invitationId: params.invitationId,
    });
    throwIfAuthClientError(acceptResult);

    const organizationId = resolveOrganizationIdAfterAccept(
        acceptResult.data,
        params.organizationId
    );

    const setActiveResult = await authClient.organization.setActive({
        organizationId,
    });
    throwIfAuthClientError(setActiveResult);

    return {
        data: acceptResult.data,
        organizationId,
    };
}
