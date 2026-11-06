import { ConvexError, v } from 'convex/values';
import * as memberships from './features/organizations/memberships';
import { invitationAllowsRegistration } from './features/organizations/invitations';
import { ERROR_CODES } from './shared/errorCodes';
import type { GenericCtx } from './shared/ctx';
import { recoverActorSessionsBatch } from './features/auth/sessions';
import { buildBetterAuthOptions } from './features/auth/options';
import { defineAuth } from './generated/auth';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { getUser } from './features/auth/authRecords';
import { queryWithRLS } from './features/authorization/wrappers';
import {
    actorSessionRecoveryPhaseValidator,
    userDocumentValidator,
} from './features/auth/validators';
import { getPasswordHash, organizationsNeedingNewOwner } from './features/auth/accountDeletion';

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
    returns: v.string(),
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
        phase: actorSessionRecoveryPhaseValidator,
    }),
    args: {
        organizationId: v.string(),
        actorUserId: v.string(),
        phase: v.optional(actorSessionRecoveryPhaseValidator),
    },
    handler: async (ctx, args) => {
        const phase = args.phase ?? 'actor-null';
        const nextPhase = await recoverActorSessionsBatch(ctx, { ...args, phase });

        if (!nextPhase) {
            return { status: 'completed' as const, phase };
        }

        await ctx.scheduler.runAfter(0, internal.auth.recoverSessionsAfterOrganizationDeletion, {
            organizationId: args.organizationId,
            actorUserId: args.actorUserId,
            phase: nextPhase,
        });

        return { status: 'in_progress' as const, phase: nextPhase };
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
            userId: v.string(),
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

        return {
            userId,
            isSetupUser: settings?.setupCompletedBy === userId,
            passwordHash: await getPasswordHash(ctx, userId),
            organizationsNeedingNewOwner: await organizationsNeedingNewOwner(ctx, userId),
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
            organizationsNeedingNewOwner: await organizationsNeedingNewOwner(ctx, ctx.userId),
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
        organizationId: v.union(v.string(), v.null()),
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
