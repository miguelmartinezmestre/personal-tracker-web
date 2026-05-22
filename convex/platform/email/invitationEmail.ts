export type InvitationEmailInput = {
    siteUrl: string;
    invitationId: string;
    inviteeEmail: string;
    organizationName: string;
    inviterName?: string | null;
    role?: string | string[] | null;
};

export function buildInvitationUrl(siteUrl: string, invitationId: string) {
    return new URL(`/invitations/${encodeURIComponent(invitationId)}`, siteUrl).toString();
}

export function formatInvitationRole(role: string | string[] | null | undefined) {
    if (Array.isArray(role)) {
        return role.join(', ');
    }

    return role ?? 'member';
}

export function buildInvitationEmail(input: InvitationEmailInput) {
    const invitationUrl = buildInvitationUrl(input.siteUrl, input.invitationId);
    const role = formatInvitationRole(input.role);
    const inviter = input.inviterName ?? 'A team member';

    return {
        to: input.inviteeEmail,
        subject: `You have been invited to join ${input.organizationName}`,
        text: [
            `${inviter} invited you to join ${input.organizationName} as ${role}.`,
            '',
            `Accept the invitation here: ${invitationUrl}`,
            '',
            'If you were not expecting this invitation, you can ignore this email.',
        ].join('\n'),
    };
}
