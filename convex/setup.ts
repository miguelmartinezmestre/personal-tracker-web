import { query, mutation } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserIdentity } from 'better-convex/auth';
import type { Id } from './_generated/dataModel';

/**
 * Public query — no auth required.
 * Returns whether the platform has been set up (platformSettings has any record).
 */
export const isPlatformSetUp = query({
    args: {},
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        return settings !== null;
    },
});

/**
 * Public query — no auth required.
 * Returns safe-to-expose platform branding info (name, language, registration policy).
 */
export const getPublicPlatformSettings = query({
    args: {},
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        if (!settings) return null;
        return {
            platformName: settings.platformName,
            defaultLanguage: settings.defaultLanguage,
            registrationPolicy: settings.registrationPolicy,
        };
    },
});

/**
 * Setup completion mutation — raw (no RLS).
 *
 * Security guards (all checked atomically within the Convex transaction):
 * 1. User must be authenticated (just signed up).
 * 2. platformSettings must be empty (first-time setup only).
 * 3. Exactly 1 user must exist in the DB (the deployer).
 *
 * This mutation:
 * - Promotes the user to admin role
 * - Updates the auto-created organization with the configured name/logo
 * - Creates default categories for the org
 * - Inserts the platformSettings record
 */
export const completeSetup = mutation({
    args: {
        platformName: v.string(),
        defaultLanguage: v.string(),
        registrationPolicy: v.string(),
        organizationName: v.string(),
        organizationLogo: v.optional(v.string()),
        categories: v.array(
            v.object({
                name: v.string(),
                color: v.string(),
                icon: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Guard 1: Must be authenticated
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError('Authentication required to complete setup');
        }

        const userId = identity.userId as Id<'user'>;

        // Guard 2: Platform must not be set up yet
        const existingSettings = await ctx.db.query('platformSettings').first();
        if (existingSettings) {
            throw new ConvexError('Platform is already configured');
        }

        // Guard 3: Only 1 user must exist
        const allUsers = await ctx.db.query('user').collect();
        if (allUsers.length !== 1) {
            throw new ConvexError('Setup can only be completed when exactly one user exists');
        }

        const currentUser = allUsers[0]!;
        if (currentUser._id !== userId) {
            throw new ConvexError('Setup must be completed by the only registered user');
        }

        // Promote user to admin
        await ctx.db.patch(userId, { role: 'admin' });

        // Find the auto-created organization (from session hook) and update it
        const membership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .first();

        let organizationId: Id<'organization'>;

        if (membership) {
            organizationId = membership.organizationId as Id<'organization'>;
            // Update the existing org with the wizard-configured name/logo
            await ctx.db.patch(organizationId, {
                name: args.organizationName,
                ...(args.organizationLogo ? { logo: args.organizationLogo } : {}),
            });
        } else {
            // Fallback: create organization if session hook didn't run
            const now = Date.now();
            organizationId = await ctx.db.insert('organization', {
                name: args.organizationName,
                slug: args.organizationName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                createdAt: now,
                metadata: null,
                logo: args.organizationLogo ?? null,
            });

            await ctx.db.insert('member', {
                organizationId,
                userId,
                role: 'owner',
                createdAt: now,
            });
        }

        // Create categories
        const now = Date.now();
        for (const category of args.categories) {
            await ctx.db.insert('categories', {
                userId,
                organizationId,
                name: category.name,
                color: category.color,
                icon: category.icon,
                createdAt: now,
                updatedAt: now,
            });
        }

        // Insert platform settings
        await ctx.db.insert('platformSettings', {
            platformName: args.platformName,
            defaultLanguage: args.defaultLanguage,
            registrationPolicy: args.registrationPolicy,
            setupCompletedAt: now,
            setupCompletedBy: userId,
        });

        return { success: true, organizationId };
    },
});
