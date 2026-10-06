import { defaultAc, userAc } from 'better-auth/plugins/admin/access';
import { ConvexError } from 'convex/values';
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server';
import { ERROR_CODES } from './constants';
import {
    personalOrganizationMetadataSchema,
    isPersonalOrganizationMetadata,
} from './personalOrganization';
import { DEFAULT_ORGANIZATION_SLUG_BASE } from './personalOrganization';
import { Triggers } from 'convex-helpers/server/triggers';
import type { DataModel, Id } from './_generated/dataModel';
import { customCtx, customMutation } from 'convex-helpers/server/customFunctions';
import { env, internalMutation as rawInternalMutation } from './_generated/server';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { z } from 'zod';
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';

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

export type AuditTriggerCtx = MutationCtx & {
    userId?: Id<'user'>;
    organizationId?: Id<'organization'> | null;
    role?: string;
};

export const domainTriggers = new Triggers<DataModel, AuditTriggerCtx>();

export const internalMutation = customMutation(
    rawInternalMutation,
    customCtx(domainTriggers.wrapDB)
);

export function buildInvitationUrl(siteUrl: string, invitationId: string): string {
    return new URL(`/invitations/${encodeURIComponent(invitationId)}`, siteUrl).toString();
}

export function formatInvitationRole(role?: string | string[] | null): string {
    return Array.isArray(role) ? role.join(', ') : (role ?? 'member');
}

export function buildInvitationEmail(input: {
    siteUrl: string;
    invitationId: string;
    inviteeEmail: string;
    organizationName: string;
    inviterName?: string | null;
    role?: string | string[] | null;
}) {
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
    if (paginationOpts.cursor && !paginationOpts.cursor.startsWith('vp1.')) {
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
export const STRONG_PASSWORD_MESSAGE_ES =
    'La contraseña debe incluir al menos una mayúscula, una minúscula y un número';
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

const cursorSchema = z.object({
    scope: z.string(),
    cursor: z.string().nullable(),
    done: z.boolean(),
    pending: z.array(z.string()).max(600),
    collected: z.array(z.string()).max(101),
    fingerprints: z.record(z.string(), z.string()).optional(),
});
type Cursor = z.infer<typeof cursorSchema>;

function encryptionKey(): string {
    const secret = env.BETTER_AUTH_SECRET;
    if (!secret) {
        throw new ConvexError('INTERNAL_ERROR');
    }
    return `visible-pagination-v1:${secret}`;
}

async function decodeCursor(cursor: string | null, scope: string): Promise<Cursor> {
    if (!cursor || !cursor.startsWith('vp1.')) {
        return { scope, cursor: null, done: false, pending: [], collected: [] };
    }
    try {
        if (cursor.length > 1_000_000) {
            throw new Error('Cursor too large');
        }
        const decoded = cursorSchema.parse(
            JSON.parse(await symmetricDecrypt({ key: encryptionKey(), data: cursor.slice(4) }))
        );
        if (decoded.scope !== scope) {
            throw new Error('Cursor scope changed');
        }
        return decoded;
    } catch {
        throw new ConvexError('INVALID_CURSOR');
    }
}

export type VisiblePage<T> = PaginationResult<T> & { needsContinuation: boolean };

export async function paginateVisible<T extends { _id: string }>(options: {
    scope: string;
    paginationOpts: PaginationOptions;
    fetchPage: (paginationOpts: PaginationOptions) => Promise<PaginationResult<T>>;
    get: (id: string) => Promise<T | null>;
    accepts: (document: T) => Promise<boolean> | boolean;
    fingerprint?: (document: T) => string;
}): Promise<VisiblePage<T>> {
    const limits = withPaginationLimits(options.paginationOpts);
    const state = await decodeCursor(limits.cursor, options.scope);
    if (limits.cursor && options.fingerprint && !state.fingerprints) {
        throw new ConvexError('INVALID_CURSOR');
    }
    const fingerprints = new Map(Object.entries(state.fingerprints ?? {}));
    const budget = limits.maximumRowsRead ?? 500;
    const page: T[] = [];
    const seen = new Set<string>();
    const cache = new Map<string, T>();
    let reads = 0;
    const pending = [...state.collected, ...state.pending];

    async function consume(): Promise<void> {
        while (pending.length && page.length <= limits.numItems) {
            const id = pending[0];
            if (!id) {
                break;
            }
            if (!cache.has(id) && reads >= budget) {
                break;
            }
            pending.shift();
            if (seen.has(id)) {
                continue;
            }
            seen.add(id);
            const cached = cache.get(id);
            if (!cached) {
                reads++;
            }
            const document = cached ?? (await options.get(id));
            if (document && options.fingerprint) {
                const current = options.fingerprint(document);
                const previous = fingerprints.get(id);
                if (previous !== undefined && previous !== current) {
                    throw new ConvexError('INVALID_CURSOR');
                }
                fingerprints.set(id, current);
            }
            if (document && (await options.accepts(document))) {
                page.push(document);
            }
        }
    }

    await consume();
    if (pending.length === 0 && page.length <= limits.numItems && !state.done && reads < budget) {
        const result = await options.fetchPage({
            ...limits,
            cursor: state.cursor,
            numItems: budget - reads,
            maximumRowsRead: budget - reads,
        });
        state.cursor = result.continueCursor;
        state.done = result.isDone;
        reads += result.page.length;
        for (const document of result.page) {
            if (options.fingerprint) {
                fingerprints.set(document._id, options.fingerprint(document));
            }
            cache.set(document._id, document);
            pending.push(document._id);
        }
        await consume();
    }

    const hasNext = page.length > limits.numItems;
    const isDone = state.done && pending.length === 0 && !hasNext;
    const needsContinuation = !hasNext && !isDone;
    const visible = page.slice(0, limits.numItems);
    const extra = hasNext ? page.slice(limits.numItems).map(document => document._id) : [];
    const next: Cursor = {
        scope: options.scope,
        cursor: state.cursor,
        done: state.done,
        pending: [...extra, ...pending],
        collected: needsContinuation ? visible.map(document => document._id) : [],
    };
    if (options.fingerprint) {
        const buffered = new Set([...next.pending, ...next.collected]);
        next.fingerprints = Object.fromEntries(
            [...fingerprints].filter(([id]) => buffered.has(id))
        );
    }
    let continueCursor: string;
    if (isDone) {
        continueCursor = '';
    } else {
        continueCursor = `vp1.${await symmetricEncrypt({
            key: encryptionKey(),
            data: JSON.stringify(next),
        })}`;
    }
    return { page: visible, continueCursor, isDone, needsContinuation };
}
