import { defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { ConvexError } from 'convex/values';
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server';
import { ERROR_CODES } from './constants';
import {
    personalOrganizationMetadataSchema,
    isPersonalOrganizationMetadata,
} from './personalOrganization';
import { DEFAULT_ORGANIZATION_SLUG_BASE } from './personalOrganization';
import type { PaginationOptions } from 'convex/server';

export const GLOBAL_ADMIN_ROLE = 'globalAdmin' as const;
export const USER_ROLE = 'user' as const;
export type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
export type RunnableCtx = MutationCtx | ActionCtx;

export function isActiveAccount(
    user: { banned?: boolean | null; banExpires?: number | null; deletedAt?: number } | null,
    now: number
): boolean {
    return (
        user !== null &&
        user.deletedAt === undefined &&
        !(user.banned === true && (user.banExpires == null || user.banExpires > now))
    );
}

export const platformAdminRoles = [GLOBAL_ADMIN_ROLE];
const platformGlobalAdminAc = defaultAc.newRole({ user: [], session: [] });

export const platformRoles = {
    [GLOBAL_ADMIN_ROLE]: platformGlobalAdminAc,
    [USER_ROLE]: userAc,
};

export function isGlobalAdminRole(
    role: string | null | undefined
): role is typeof GLOBAL_ADMIN_ROLE {
    return role === GLOBAL_ADMIN_ROLE;
}

export function isRunnableCtx(ctx: GenericCtx): ctx is RunnableCtx {
    return 'runMutation' in ctx;
}
export function isMutationCtx(ctx: GenericCtx): ctx is MutationCtx {
    return 'runMutation' in ctx && 'db' in ctx && 'scheduler' in ctx;
}
export function requireRunnableCtx(ctx: GenericCtx): RunnableCtx {
    if (!isRunnableCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return ctx;
}
export function requireMutationCtx(ctx: GenericCtx): MutationCtx {
    if (!isMutationCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    return ctx;
}
export function readAuthStringField(
    body: Record<string, unknown> | undefined,
    key: string
): string | undefined {
    if (!body) {
        return undefined;
    }
    const value = body[key];
    return typeof value === 'string' ? value : undefined;
}
export function usesReservedPersonalOrganizationIdentity(organization: {
    slug?: string | null;
    metadata?: string | Record<string, unknown> | null;
}) {
    const reservedSlug =
        typeof organization.slug === 'string' &&
        organization.slug.startsWith(`${DEFAULT_ORGANIZATION_SLUG_BASE}-`);
    if (reservedSlug) {
        return true;
    }
    if (typeof organization.metadata === 'string') {
        return isPersonalOrganizationMetadata(organization.metadata);
    }
    return personalOrganizationMetadataSchema.safeParse(organization.metadata).success;
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

export const ORGANIZATION_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];

export function isOrganizationAdminRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.ADMIN || role === ORGANIZATION_ROLE.OWNER;
}

export function isOrganizationOwnerRole(role: string | null | undefined): boolean {
    return role === ORGANIZATION_ROLE.OWNER;
}

export function isOrganizationRoleValue(role: string): role is OrganizationRole {
    return (
        role === ORGANIZATION_ROLE.OWNER ||
        role === ORGANIZATION_ROLE.ADMIN ||
        role === ORGANIZATION_ROLE.MEMBER
    );
}

const DEFAULT_SLUG_PREFIX = 'organization';
const MAX_SLUG_LENGTH = 80;

function stableStringHash(value: string): string {
    let hash = 0x811c9dc5;

    for (const character of value) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(36);
}

export function buildOrganizationSlug(value: string): string {
    const trimmedValue = value.trim();
    const asciiSlug = trimmedValue
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, '');

    if (asciiSlug) {
        return asciiSlug;
    }

    return `${DEFAULT_SLUG_PREFIX}-${stableStringHash(trimmedValue || value)}`;
}

export const MAX_PAGE_ITEMS = 100;
export const MAX_PAGE_ROWS_READ = 500;
export const MAX_PAGE_BYTES_READ = 4 * 1024 * 1024;

function boundedPositiveInteger(value: number | undefined, fallback: number, maximum: number) {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    return Math.min(value, maximum);
}

export function withPaginationLimits(paginationOpts: PaginationOptions): PaginationOptions {
    return {
        ...paginationOpts,
        numItems: boundedPositiveInteger(paginationOpts.numItems, MAX_PAGE_ITEMS, MAX_PAGE_ITEMS),
        maximumRowsRead: boundedPositiveInteger(
            paginationOpts.maximumRowsRead,
            MAX_PAGE_ROWS_READ,
            MAX_PAGE_ROWS_READ
        ),
        maximumBytesRead: boundedPositiveInteger(
            paginationOpts.maximumBytesRead,
            MAX_PAGE_BYTES_READ,
            MAX_PAGE_BYTES_READ
        ),
    };
}

export async function withInvalidCursorRetry<T>(
    paginationOpts: PaginationOptions,
    queryPage: (paginationOpts: PaginationOptions) => Promise<T>
): Promise<T> {
    let normalizedOptions = withPaginationLimits(paginationOpts);
    if (paginationOpts.cursor) {
        try {
            JSON.parse(paginationOpts.cursor);
        } catch {
            normalizedOptions = { ...normalizedOptions, cursor: null };
        }
    }

    return await queryPage(normalizedOptions);
}

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PASSWORD_MIN_LENGTH = 8;
type PasswordPolicyCode = 'PASSWORD_TOO_SHORT' | 'WEAK_PASSWORD';
type PasswordPolicyResult =
    | {
          ok: true;
      }
    | {
          ok: false;
          code: PasswordPolicyCode;
          message: string;
      };
const STRONG_PASSWORD_MESSAGE_EN =
    'Password must include at least one uppercase letter, one lowercase letter, and one number';
const PASSWORD_TOO_SHORT_MESSAGE_EN = 'Password must be at least 8 characters long';
export function validatePasswordPolicy(
    password: string | number | boolean | null | object | undefined
): PasswordPolicyResult {
    if (!(typeof password === 'string') || password.length < PASSWORD_MIN_LENGTH) {
        return {
            ok: false,
            code: 'PASSWORD_TOO_SHORT',
            message: PASSWORD_TOO_SHORT_MESSAGE_EN,
        };
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
        return {
            ok: false,
            code: 'WEAK_PASSWORD',
            message: STRONG_PASSWORD_MESSAGE_EN,
        };
    }
    return { ok: true };
}

const DEFAULT_AUTH_CALLBACK = '/dashboard/home';
const AUTH_ROUTES = ['/login', '/register', '/forget-password', '/reset-password'];
const PROTECTED_PREFIX = '/dashboard';

export function getSafeCallbackPath(
    value: string | null | undefined,
    fallback = DEFAULT_AUTH_CALLBACK
): string {
    const candidate = value?.trim();
    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
        return fallback;
    }

    if (candidate.includes('\\')) {
        return fallback;
    }

    try {
        const base = new URL('https://callback.invalid');
        const parsed = new URL(candidate, base);
        if (parsed.origin === base.origin) {
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return fallback;
    } catch {
        return fallback;
    }
}

export function getInvitationCallbackPath(invitationId: string): string {
    return getSafeCallbackPath(`/invitations/${encodeURIComponent(invitationId)}`);
}

export function getInvitationIdFromCallbackPath(value: string | null | undefined): string | null {
    const safePath = getSafeCallbackPath(value, '');
    if (!safePath) {
        return null;
    }

    const parsed = new URL(safePath, 'https://callback.invalid');
    const match = /^\/invitations\/([^/]+)$/.exec(parsed.pathname);
    if (!match?.[1]) {
        return null;
    }

    try {
        const invitationId = decodeURIComponent(match[1]);
        return invitationId.trim() ? invitationId : null;
    } catch {
        return null;
    }
}

export function getAuthRouteRedirect({
    pathname,
    search,
    hasSessionCookie,
}: {
    pathname: string;
    search: string;
    hasSessionCookie: boolean;
}): string | null {
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.endsWith(route));
    if (isAuthRoute) {
        return null;
    }

    if (!hasSessionCookie && pathname.startsWith(PROTECTED_PREFIX)) {
        const params = new URLSearchParams({
            callbackUrl: getSafeCallbackPath(`${pathname}${search}`),
        });
        return `/login?${params.toString()}`;
    }

    return null;
}
