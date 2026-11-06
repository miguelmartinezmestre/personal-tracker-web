import { ConvexError, v } from 'convex/values';
import * as memberships from './features/organizations/memberships';
import { invitationAllowsRegistration } from './features/organizations/invitations';
import { ERROR_CODES } from './shared/errorCodes';
import type { GenericCtx } from './shared/ctx';
import {
    NEXT_SESSION_RECOVERY_PHASE,
    SESSION_RECOVERY_BATCH_SIZE,
    type SessionRecoveryResult,
    actorPhaseOrganizationId,
    repairSessionsAfterOrganizationDeletion,
    scheduleSessionRecovery,
} from './features/auth/sessionRecovery';
import { buildBetterAuthOptions } from './features/auth/options';
import { defineAuth } from './generated/auth';
import { internalMutation, internalQuery } from './_generated/server';
import { getUser } from './features/auth/authRecords';
import { queryWithRLS } from './features/authorization/wrappers';
import { userDocumentValidator } from './features/auth/validators';
import { organizationsNeedingNewOwner } from './features/auth/accountDeletion';

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

        const allowed =
            args.invitationId !== null &&
            (await invitationAllowsRegistration(ctx, {
                email: args.email,
                invitationId: args.invitationId,
                now: args.now,
            }));

        return allowed ? 'allowed' : 'denied';
    },
});

export const ensureDefaultOrganizationForUser = internalMutation({
    returns: v.id('organization'),
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        return await memberships.ensureDefaultOrganizationForUser(ctx, args.userId);
    },
});

export const recoverSessionsAfterOrganizationDeletion = internalMutation({
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: v.union(
            v.literal('actor-null'),
            v.literal('actor-unset'),
            v.literal('actor-deleted')
        ),
    }),
    args: {
        organizationId: v.string(),
        actorUserId: v.string(),
        phase: v.optional(
            v.union(v.literal('actor-null'), v.literal('actor-unset'), v.literal('actor-deleted'))
        ),
    },
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);
        const actorUserId = ctx.db.normalizeId('user', args.actorUserId);

        if (!organizationId || !actorUserId) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }

        const phase = args.phase ?? 'actor-null';
        const activeOrganizationId = actorPhaseOrganizationId(phase, organizationId);

        const sessions = await ctx.db
            .query('session')
            .withIndex('by_userId_and_activeOrganizationId', q =>
                q.eq('userId', actorUserId).eq('activeOrganizationId', activeOrganizationId)
            )
            .take(SESSION_RECOVERY_BATCH_SIZE);

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

export const userHasOrganizationNamed = internalQuery({
    returns: v.boolean(),
    args: {
        userId: v.string(),
        name: v.string(),
        excludeOrganizationId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await memberships.userHasOrganizationNamed(ctx, args);
    },
});

export const isDefaultOrganization = internalQuery({
    returns: v.boolean(),
    args: {
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        return await memberships.isDefaultOrganization(ctx, args.organizationId);
    },
});

export const getAccountDeletionTarget = internalQuery({
    args: { userId: v.string() },
    returns: v.union(
        v.object({
            userId: v.id('user'),
            isSetupUser: v.boolean(),
            passwordHash: v.union(v.string(), v.null()),
            organizationsNeedingNewOwner: v.array(v.string()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const userId = ctx.db.normalizeId('user', args.userId);

        if (!userId) {
            return null;
        }

        const settings = await ctx.db.query('platformSettings').first();

        const account = await ctx.db
            .query('account')
            .withIndex('providerId_userId', q =>
                q.eq('providerId', 'credential').eq('userId', userId)
            )
            .unique();

        return {
            userId,
            isSetupUser: settings?.setupCompletedBy === userId,
            passwordHash: account?.password ?? null,
            organizationsNeedingNewOwner: await organizationsNeedingNewOwner(ctx.db, userId),
        };
    },
});

export default defineAuth((ctx: GenericCtx) => buildBetterAuthOptions(ctx));

export const getAccountDeletionStatus = queryWithRLS({
    args: {},
    returns: v.object({
        isSetupUser: v.boolean(),
        organizationsNeedingNewOwner: v.array(v.string()),
    }),
    handler: async ctx => {
        const settings = await ctx.dbForIntegrityChecks.query('platformSettings').first();

        return {
            isSetupUser: settings?.setupCompletedBy === ctx.userId,
            organizationsNeedingNewOwner: await organizationsNeedingNewOwner(
                ctx.dbForIntegrityChecks,
                ctx.userId
            ),
        };
    },
});

export const getCurrentUser = queryWithRLS({
    args: {},
    returns: v.union(userDocumentValidator, v.null()),
    handler: async ctx => {
        return await getUser(ctx, ctx.userId);
    },
});

export const getDashboardContext = queryWithRLS({
    args: {},
    returns: v.object({
        user: userDocumentValidator,
        organizationId: v.union(v.id('organization'), v.null()),
    }),
    handler: async ctx => {
        const user = await getUser(ctx, ctx.userId);

        if (!user) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        return {
            user,
            organizationId: ctx.organizationId,
        };
    },
});
