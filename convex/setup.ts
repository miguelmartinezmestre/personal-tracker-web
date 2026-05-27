import { ConvexError, v } from 'convex/values';
import { getAuthUserIdentity } from 'kitcn/auth';
import { internal } from './_generated/api';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
    completePlatformSetup,
    ensureTestOrganizationForUser,
    getPublicSettings,
    isPlatformConfigured,
    requireAdminUser,
} from './platform/setup/bootstrap';
import {
    completeSetupArgsValidator,
    ensureTestOrganizationArgsValidator,
    ensureTestOrganizationInternalArgsValidator,
} from './platform/setup/validators';
import { ERROR_CODES } from './utils/constants';
import { env } from './lib/env';

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

        return await completePlatformSetup(ctx, identity.userId, args);
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

export const ensureTestOrganization = mutation({
    args: ensureTestOrganizationArgsValidator,
    returns: v.object({
        organizationId: v.id('organization'),
        memberId: v.union(v.id('member'), v.null()),
    }),
    handler: async (
        ctx,
        args
    ): Promise<{ organizationId: Id<'organization'>; memberId: Id<'member'> | null }> => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }

        const userId = identity.userId;

        if (!env.ALLOW_SETUP_TEST) {
            await ctx.runQuery(internal.setup.requireAdminInternal, { userId });
        }

        return await ctx.runMutation(internal.setup.ensureTestOrganizationInternal, {
            userId,
            organizationName: args.organizationName,
            createPersonalCategory: args.createPersonalCategory,
        });
    },
});
