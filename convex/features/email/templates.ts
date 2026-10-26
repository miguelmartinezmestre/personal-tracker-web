import { z } from 'zod';

/** Normalizes an invitation address, or returns null when it is not a single valid email. */
export function normalizeInvitationEmail(value: string): string | null {
    const result = z.email().safeParse(value.trim());

    return result.success ? result.data.toLowerCase() : null;
}

export function buildInvitationUrl(siteUrl: string, invitationId: string): string {
    return new URL(`/invitations/${encodeURIComponent(invitationId)}`, siteUrl).toString();
}

export type EmailLocale = 'en' | 'es';

const EMAIL_ROLE_LABELS: Record<EmailLocale, Record<string, string>> = {
    en: { owner: 'owner', admin: 'admin', member: 'member' },
    es: { owner: 'propietario', admin: 'administrador', member: 'miembro' },
};

function isEmailLocale(value: string | null | undefined): value is EmailLocale {
    return value === 'en' || value === 'es';
}

/**
 * Picks the language of an auth email: the requester's `locale` cookie (set by the language
 * switcher), then the platform default, then English — the same order the app uses.
 */
export function resolveEmailLocale(
    request: Request | undefined,
    platformDefault?: string | null
): EmailLocale {
    const cookieLocale = request?.headers
        .get('cookie')
        ?.match(/(?:^|;\s*)locale=(en|es)(?:;|$)/)?.[1];

    if (isEmailLocale(cookieLocale)) {
        return cookieLocale;
    }

    return isEmailLocale(platformDefault) ? platformDefault : 'en';
}

export function formatInvitationRole(
    role?: string | string[] | null,
    locale: EmailLocale = 'en'
): string {
    const roles = Array.isArray(role) ? role : [role ?? 'member'];

    return roles.map(value => EMAIL_ROLE_LABELS[locale][value] ?? value).join(', ');
}

export function buildInvitationEmail(input: {
    siteUrl: string;
    invitationId: string;
    inviteeEmail: string;
    organizationName: string;
    inviterName?: string | null;
    role?: string | string[] | null;
    locale?: EmailLocale;
}) {
    const locale = input.locale ?? 'en';
    const invitationUrl = buildInvitationUrl(input.siteUrl, input.invitationId);
    const role = formatInvitationRole(input.role, locale);

    if (locale === 'es') {
        const inviter = input.inviterName ?? 'Un miembro del equipo';

        return {
            to: input.inviteeEmail,
            subject: `Te han invitado a unirte a ${input.organizationName}`,
            text: [
                `${inviter} te ha invitado a unirte a ${input.organizationName} como ${role}.`,
                '',
                `Acepta la invitación aquí: ${invitationUrl}`,
                '',
                'Si no esperabas esta invitación, puedes ignorar este correo.',
            ].join('\n'),
        };
    }

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

export function buildPasswordResetEmail(input: { to: string; url: string; locale: EmailLocale }) {
    if (input.locale === 'es') {
        return {
            to: input.to,
            subject: 'Restablece tu contraseña',
            text: [
                `Abre este enlace para restablecer tu contraseña: ${input.url}`,
                '',
                'Si no lo has pedido tú, puedes ignorar este correo.',
            ].join('\n'),
        };
    }

    return {
        to: input.to,
        subject: 'Reset your password',
        text: [
            `Click the link to reset your password: ${input.url}`,
            '',
            'If you did not request this, you can ignore this email.',
        ].join('\n'),
    };
}

export function buildVerificationEmail(input: { to: string; url: string; locale: EmailLocale }) {
    if (input.locale === 'es') {
        return {
            to: input.to,
            subject: 'Verifica tu correo electrónico',
            text: `Abre este enlace para verificar tu correo electrónico: ${input.url}`,
        };
    }

    return {
        to: input.to,
        subject: 'Verify your email address',
        text: `Click the link to verify your email address: ${input.url}`,
    };
}
