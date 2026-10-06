import { internal } from './_generated/api';
import { internalQuery, type MutationCtx } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { ERROR_CODES } from './constants';
import { defineAuth } from './generated/auth';
import { queryWithRLS } from './rls/wrappers';
import {
    DEFAULT_ORGANIZATION_NAME,
    buildPersonalOrganizationMetadata,
    buildDefaultOrganizationSlug,
    getPersonalOrganizationOwnerUserId,
    isPersonalOrganizationForUser,
} from './personalOrganization';
import { buildBetterAuthOptions } from './authOptions';
import { internalMutation, isActiveAccount, type GenericCtx } from './utils';
const SESSION_RECOVERY_BATCH_SIZE = 20;
type SessionRecoveryPhase = 'actor-null' | 'actor-unset' | 'actor-deleted' | 'affected';
type SessionRecoveryResult = {
    status: 'in_progress' | 'completed';
    phase: SessionRecoveryPhase;
};
const NEXT_SESSION_RECOVERY_PHASE: Record<SessionRecoveryPhase, SessionRecoveryPhase | null> = {
    'actor-null': 'actor-unset',
    'actor-unset': 'actor-deleted',
    'actor-deleted': 'affected',
    affected: null,
};
function actorPhaseOrganizationId(
    phase: Exclude<SessionRecoveryPhase, 'affected'>,
    organizationId: Id<'organization'>
): Id<'organization'> | null | undefined {
    switch (phase) {
        case 'actor-null':
            return null;
        case 'actor-unset':
            return undefined;
        case 'actor-deleted':
            return organizationId;
    }
}
function normalizeRegistrationEmail(email: string) {
    return email.trim().toLowerCase();
}
export const getEmailRegistrationAuthorization = internalQuery({
    args: {
        email: v.string(),
        invitationId: v.union(v.string(), v.null()),
        now: v.number(),
    },
    returns: v.union(v.literal('bootstrap'), v.literal('allowed'), v.literal('denied')),
    handler: async (ctx, args) => {
        const settings = await ctx.db.query('platformSettings').first();
        if (!settings) {
            return 'bootstrap';
        }
        if (settings.registrationPolicy === 'open') {
            return 'allowed';
        }
        const normalizedEmail = normalizeRegistrationEmail(args.email);
        if (!normalizedEmail || !args.invitationId) {
            return 'denied';
        }
        const invitationId = ctx.db.normalizeId('invitation', args.invitationId);
        if (!invitationId) {
            return 'denied';
        }
        const invitation = await ctx.db.get('invitation', invitationId);
        if (
            !invitation ||
            invitation.status !== 'pending' ||
            invitation.expiresAt <= args.now ||
            normalizeRegistrationEmail(invitation.email) !== normalizedEmail
        ) {
            return 'denied';
        }
        const organization = await ctx.db.get('organization', invitation.organizationId);
        return organization ? 'allowed' : 'denied';
    },
});
export const ensureDefaultOrganizationForUser = internalMutation({
    returns: v.id('organization'),
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = ctx.db.normalizeId('user', args.userId);
        if (!userId) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }
        for await (const membership of ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))) {
            if (await ctx.db.get('organization', membership.organizationId)) {
                return membership.organizationId;
            }
        }
        const now = Date.now();
        const slug = await buildAvailablePersonalOrganizationSlug(ctx, userId);
        const organizationId = await ctx.db.insert('organization', {
            name: DEFAULT_ORGANIZATION_NAME,
            slug,
            createdAt: now,
            metadata: buildPersonalOrganizationMetadata(userId),
            logo: null,
        });
        await ctx.db.insert('member', {
            organizationId,
            userId,
            role: 'owner',
            createdAt: now,
        });
        return organizationId;
    },
});
async function buildAvailablePersonalOrganizationSlug(ctx: MutationCtx, userId: Id<'user'>) {
    const baseSlug = buildDefaultOrganizationSlug(userId);
    let candidate = baseSlug;
    for (let attempt = 0; attempt < 5; attempt++) {
        const collision = await ctx.db
            .query('organization')
            .withIndex('slug', q => q.eq('slug', candidate))
            .first();
        if (!collision) {
            return candidate;
        }
        candidate = `${baseSlug}-${Date.now().toString(36)}-${attempt + 1}`;
    }
    throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
}
async function findOrCreateFallbackOrganization(
    ctx: MutationCtx,
    userId: Id<'user'>,
    deletedOrganizationId: Id<'organization'>
): Promise<Id<'organization'> | null> {
    const user = await ctx.db.get('user', userId);
    if (!isActiveAccount(user, Date.now())) {
        return null;
    }
    const personal = await ctx.db
        .query('organization')
        .withIndex('slug', q => q.eq('slug', buildDefaultOrganizationSlug(userId)))
        .first();
    if (
        personal &&
        personal._id !== deletedOrganizationId &&
        isPersonalOrganizationForUser({ metadata: personal.metadata, userId })
    ) {
        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', personal._id).eq('userId', userId)
            )
            .first();
        if (membership) {
            return personal._id;
        }
    }
    for await (const membership of ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))) {
        if (
            membership.organizationId !== deletedOrganizationId &&
            (await ctx.db.get('organization', membership.organizationId))
        ) {
            return membership.organizationId;
        }
    }
    const now = Date.now();
    const personalSlug = await buildAvailablePersonalOrganizationSlug(ctx, userId);
    const organizationId = await ctx.db.insert('organization', {
        name: DEFAULT_ORGANIZATION_NAME,
        slug: personalSlug,
        createdAt: now,
        metadata: buildPersonalOrganizationMetadata(userId),
        logo: null,
    });
    await ctx.db.insert('member', {
        organizationId,
        userId,
        role: 'owner',
        createdAt: now,
    });
    return organizationId;
}
async function repairSessionsAfterOrganizationDeletion(
    ctx: MutationCtx,
    sessions: Array<{
        _id: Id<'session'>;
        userId: string;
        expiresAt: number;
    }>,
    deletedOrganizationId: Id<'organization'>
) {
    const fallbackByUser = new Map<string, Id<'organization'> | null>();
    for (const session of sessions) {
        if (session.expiresAt <= Date.now()) {
            await ctx.db.delete('session', session._id);
            continue;
        }
        let fallbackOrganizationId = fallbackByUser.get(session.userId);
        if (fallbackOrganizationId === undefined) {
            const userId = ctx.db.normalizeId('user', session.userId);
            if (userId) {
                fallbackOrganizationId = await findOrCreateFallbackOrganization(
                    ctx,
                    userId,
                    deletedOrganizationId
                );
            } else {
                fallbackOrganizationId = null;
            }
            fallbackByUser.set(session.userId, fallbackOrganizationId);
        }
        if (!fallbackOrganizationId) {
            await ctx.db.delete('session', session._id);
            continue;
        }
        await ctx.db.patch('session', session._id, {
            activeOrganizationId: fallbackOrganizationId,
            updatedAt: Date.now(),
        });
    }
}
async function scheduleSessionRecovery(
    ctx: MutationCtx,
    args: {
        organizationId: Id<'organization'>;
        actorUserId: Id<'user'>;
        phase: SessionRecoveryPhase;
    }
) {
    await ctx.scheduler.runAfter(0, internal.auth.recoverSessionsAfterOrganizationDeletion, args);
}
export const recoverSessionsAfterOrganizationDeletion = internalMutation({
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: v.union(
            v.literal('actor-null'),
            v.literal('actor-unset'),
            v.literal('actor-deleted'),
            v.literal('affected')
        ),
    }),
    args: {
        organizationId: v.string(),
        actorUserId: v.string(),
        phase: v.optional(
            v.union(
                v.literal('actor-null'),
                v.literal('actor-unset'),
                v.literal('actor-deleted'),
                v.literal('affected')
            )
        ),
    },
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);
        const actorUserId = ctx.db.normalizeId('user', args.actorUserId);
        if (!organizationId || !actorUserId) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }
        const phase = args.phase ?? 'actor-null';
        let sessions: Array<{
            _id: Id<'session'>;
            userId: string;
            expiresAt: number;
        }>;
        if (phase === 'affected') {
            sessions = await ctx.db
                .query('session')
                .withIndex('activeOrganizationId', q =>
                    q.eq('activeOrganizationId', organizationId)
                )
                .take(SESSION_RECOVERY_BATCH_SIZE);
        } else {
            const activeOrganizationId = actorPhaseOrganizationId(phase, organizationId);
            sessions = await ctx.db
                .query('session')
                .withIndex('by_userId_and_activeOrganizationId', q =>
                    q.eq('userId', actorUserId).eq('activeOrganizationId', activeOrganizationId)
                )
                .take(SESSION_RECOVERY_BATCH_SIZE);
        }
        await repairSessionsAfterOrganizationDeletion(ctx, sessions, organizationId);
        if (sessions.length === SESSION_RECOVERY_BATCH_SIZE) {
            await scheduleSessionRecovery(ctx, {
                organizationId,
                actorUserId,
                phase,
            });
            const inProgress: SessionRecoveryResult = { status: 'in_progress', phase };
            return inProgress;
        }
        const nextPhase = NEXT_SESSION_RECOVERY_PHASE[phase];
        if (nextPhase) {
            await scheduleSessionRecovery(ctx, {
                organizationId,
                actorUserId,
                phase: nextPhase,
            });
            const inProgress: SessionRecoveryResult = { status: 'in_progress', phase: nextPhase };
            return inProgress;
        }
        const completed: SessionRecoveryResult = { status: 'completed', phase };
        return completed;
    },
});
export const recoverAffectedOrganizationSessions = internalMutation({
    args: { organizationId: v.id('organization') },
    returns: v.object({ remaining: v.boolean() }),
    handler: async (ctx, { organizationId }) => {
        if (await ctx.db.get('organization', organizationId)) {
            return { remaining: false };
        }
        const sessions = await ctx.db
            .query('session')
            .withIndex('activeOrganizationId', q => q.eq('activeOrganizationId', organizationId))
            .take(SESSION_RECOVERY_BATCH_SIZE);
        await repairSessionsAfterOrganizationDeletion(ctx, sessions, organizationId);
        return { remaining: sessions.length === SESSION_RECOVERY_BATCH_SIZE };
    },
});
export const isDefaultOrganization = internalQuery({
    returns: v.boolean(),
    args: {
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);
        if (!organizationId) {
            return false;
        }
        const organization = await ctx.db.get('organization', organizationId);
        if (!organization) {
            return false;
        }
        const metadataOwnerUserId = getPersonalOrganizationOwnerUserId(organization.metadata);
        if (metadataOwnerUserId) {
            const ownerUserId = ctx.db.normalizeId('user', metadataOwnerUserId);
            if (!ownerUserId) {
                return false;
            }
            const ownerMembership = await ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', organizationId).eq('userId', ownerUserId)
                )
                .first();
            return ownerMembership?.role === 'owner';
        }
        return false;
    },
});
export const getCredentialPasswordHashForDeletion = internalQuery({
    args: { userId: v.id('user') },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query('account')
            .withIndex('providerId_userId', q =>
                q.eq('providerId', 'credential').eq('userId', args.userId)
            )
            .unique();
        return typeof account?.password === 'string' ? account.password : null;
    },
});
export default defineAuth((ctx: GenericCtx) => buildBetterAuthOptions(ctx));
const userDocumentValidator = v.object({
    _id: v.id('user'),
    _creationTime: v.number(),
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.union(v.null(), v.string())),
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    banExpires: v.optional(v.union(v.null(), v.number())),
    deletedAt: v.optional(v.number()),
});
export const getCurrentUser = queryWithRLS({
    args: {},
    returns: v.union(userDocumentValidator, v.null()),
    handler: async ctx => {
        return await ctx.db.get('user', ctx.userId);
    },
});
export const getDashboardContext = queryWithRLS({
    args: {},
    returns: v.object({
        user: userDocumentValidator,
        organizationId: v.union(v.id('organization'), v.null()),
    }),
    handler: async ctx => {
        const user = await ctx.db.get('user', ctx.userId);
        if (!user) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }
        return {
            user,
            organizationId: ctx.organizationId,
        };
    },
});
