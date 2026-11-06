import { createClient, type AuthFunctions, type GenericCtx } from '@convex-dev/better-auth';
import { betterAuth } from 'better-auth/minimal';
import { ConvexError, v } from 'convex/values';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { internalMutation, internalQuery } from './_generated/server';
import authSchema from './betterAuth/schema';
import { authAuditTriggers } from './features/audit/triggers';
import { getPasswordHash, organizationsNeedingNewOwner } from './features/auth/accountDeletion';
import { getUser } from './features/auth/authRecords';
import { buildBetterAuthOptions } from './features/auth/options';
import { userDocumentValidator } from './features/auth/validators';
import { queryWithRLS } from './features/authorization/wrappers';
import { ERROR_CODES } from './shared/errorCodes';
import { ensureDefaultOrganizationForUser } from './features/organizations/memberships';
import { invitationAllowsRegistration } from './features/organizations/invitations';

// Annotated to break the type cycle between these trigger functions and authComponent.
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
    local: { schema: authSchema },
    authFunctions,
    triggers: authAuditTriggers,
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
    ...buildBetterAuthOptions(ctx),
    database: authComponent.adapter(ctx),
});

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));

/** Called by the session create hook, which runs in an HTTP action: one transaction. */
export const ensureDefaultOrganization = internalMutation({
    args: { userId: v.string() },
    returns: v.string(),
    handler: async (ctx, args) => {
        return await ensureDefaultOrganizationForUser(ctx, args.userId);
    },
});

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

        if (!args.invitationId) {
            return 'denied';
        }

        const allowed = await invitationAllowsRegistration(ctx, {
            email: args.email,
            invitationId: args.invitationId,
            now: args.now,
        });

        return allowed ? 'allowed' : 'denied';
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
        const user = await getUser(ctx, args.userId);

        if (!user) {
            return null;
        }

        const settings = await ctx.db.query('platformSettings').first();

        return {
            userId: user._id,
            isSetupUser: settings?.setupCompletedBy === user._id,
            passwordHash: await getPasswordHash(ctx, user._id),
            organizationsNeedingNewOwner: await organizationsNeedingNewOwner(ctx, user._id),
        };
    },
});

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
