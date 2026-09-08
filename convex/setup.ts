import { internalMutation } from './platform/db/internalMutation';
import { ConvexError, v } from 'convex/values';
import { getAuthUserIdentity } from 'kitcn/auth';
import { internalQuery, mutation, query } from './_generated/server';
import {
    completePlatformSetup,
    ensureTestOrganizationForUser,
    getPlatformSetupUserId as resolvePlatformSetupUserId,
    getPublicSettings,
    isPlatformConfigured,
    isPlatformSetupUser,
    requireAdminUser,
} from './platform/setup/bootstrap';
import {
    completeSetupArgsValidator,
    ensureTestOrganizationInternalArgsValidator,
} from './platform/setup/validators';
import { ERROR_CODES } from './utils/constants';
import { queryWithRLS } from './platform/rls/wrappers';
import { isGlobalAdminRole } from '../shared/platform-roles';
import { userDocumentValidator } from './utils/documentValidators';
export const isPlatformSetUp = query({
    args: {},
    returns: v.boolean(),
    handler: async ctx => {
        return await isPlatformConfigured(ctx);
    },
});
export const getPublicPlatformSettings = query({
    args: {},
    returns: v.union(
        v.object({
            platformName: v.string(),
            defaultLanguage: v.union(v.literal('en'), v.literal('es')),
            registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
        }),
        v.null()
    ),
    handler: async ctx => {
        return await getPublicSettings(ctx);
    },
});
export const completeSetup = mutation({
    args: completeSetupArgsValidator,
    returns: v.object({
        success: v.literal(true),
        organizationId: v.id('organization'),
    }),
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }
        const userId = ctx.db.normalizeId('user', identity.userId);
        if (!userId) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }
        const platformSettings = await ctx.db.query('platformSettings').first();
        if (platformSettings) {
            throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
        }
        return await completePlatformSetup(ctx, userId, args);
    },
});
export const isPlatformSetupUserInternal = internalQuery({
    args: { userId: v.id('user') },
    returns: v.boolean(),
    handler: async (ctx, args) => {
        return await isPlatformSetupUser(ctx, args.userId);
    },
});
export const isCurrentUserPlatformSetupUser = query({
    args: {},
    returns: v.boolean(),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            return false;
        }
        const userId = ctx.db.normalizeId('user', identity.userId);
        if (!userId) {
            return false;
        }
        return await isPlatformSetupUser(ctx, userId);
    },
});
export const getPlatformSetupUserId = queryWithRLS({
    args: {},
    returns: v.union(v.id('user'), v.null()),
    handler: async ctx => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        return await resolvePlatformSetupUserId(ctx);
    },
});
export const requireAdminInternal = internalQuery({
    returns: userDocumentValidator,
    args: { userId: v.id('user') },
    handler: async (ctx, args) => {
        return await requireAdminUser(ctx, args.userId);
    },
});
export const ensureTestOrganizationInternal = internalMutation({
    returns: v.object({
        organizationId: v.id('organization'),
        memberId: v.union(v.id('member'), v.null()),
    }),
    args: ensureTestOrganizationInternalArgsValidator,
    handler: async (ctx, args) => {
        return await ensureTestOrganizationForUser(ctx, args);
    },
});
