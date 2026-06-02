import { ConvexError, v } from 'convex/values';
import { getAuthUserIdentity } from 'kitcn/auth';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import {
    completePlatformSetup,
    ensureTestOrganizationForUser,
    getPublicSettings,
    isPlatformConfigured,
    requireAdminUser,
} from './platform/setup/bootstrap';
import {
    completeSetupArgsValidator,
    ensureTestOrganizationInternalArgsValidator,
} from './platform/setup/validators';
import { ERROR_CODES } from './utils/constants';

export const isPlatformSetUp = query({
    args: {},
    handler: async ctx => {
        return await isPlatformConfigured(ctx);
    },
});

export const getPublicPlatformSettings = query({
    args: {},
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

export const requireAdminInternal = internalQuery({
    args: { userId: v.id('user') },
    handler: async (ctx, args) => {
        return await requireAdminUser(ctx, args.userId);
    },
});

export const ensureTestOrganizationInternal = internalMutation({
    args: ensureTestOrganizationInternalArgsValidator,
    handler: async (ctx, args) => {
        return await ensureTestOrganizationForUser(ctx, args);
    },
});
