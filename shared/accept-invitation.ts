export type AcceptInvitationPayload = {
    invitation?: { organizationId?: string | null } | null;
    member?: { organizationId?: string | null } | null;
};

/**
 * Resolve the organization that should become active after a successful
 * invitation accept. Prefer an explicit known id (dashboard list), then the
 * member/invitation payload returned by Better Auth.
 */
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
