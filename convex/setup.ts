import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { ERROR_CODES } from './shared/errorCodes';
import { GLOBAL_ADMIN_ROLE } from './features/auth/roles';
import { buildOrganizationSlug } from './features/organizations/slug';
import { completeSetupArgsValidator } from './features/setup/validators';
import { getAuthUserIdentity } from 'kitcn/auth';
import { isFirstSetupUser, validateSetupArgs } from './features/setup/rules';
import { isPersonalOrganizationForUser } from './features/organizations/personalOrganization';
import { insertAuditLog } from './features/audit/log';
import { query } from './_generated/server';
import { mutation } from './features/objectives/stats';
import { normalizeCategory } from './features/categories/rules';

export const isPlatformSetUp = query({
    args: {},
    returns: v.boolean(),
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();

        return settings !== null;
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
        const settings = await ctx.db.query('platformSettings').first();

        if (!settings) {
            return null;
        }

        return {
            platformName: settings.platformName,
            defaultLanguage: settings.defaultLanguage,
            registrationPolicy: settings.registrationPolicy,
        };
    },
});

export const completeSetup = mutation({
    args: completeSetupArgsValidator,
    returns: v.object({
        organizationId: v.id('organization'),
    }),
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        const userId = ctx.db.normalizeId('user', identity?.userId ?? '');

        if (!userId) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }

        const platformSettings = await ctx.db.query('platformSettings').first();

        if (platformSettings) {
            throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
        }

        validateSetupArgs(args);

        const categories = new Map(
            args.categories.map(normalizeCategory).map(category => [category.name, category])
        );

        if (!(await isFirstSetupUser(ctx, userId))) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_MISMATCH);
        }

        await ctx.db.patch('user', userId, { role: GLOBAL_ADMIN_ROLE });
        await insertAuditLog(ctx, {
            action: 'user.role_changed',
            resourceType: 'user',
            resourceId: userId,
            userId,
            severity: 'critical',
            metadata: { after: { role: GLOBAL_ADMIN_ROLE } },
        });

        let reusableOrganizationId: Id<'organization'> | null = null;
        const personalOrganizationIds = new Set<Id<'organization'>>();

        for await (const membership of ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))) {
            const organization = await ctx.db.get('organization', membership.organizationId);

            if (!organization) {
                continue;
            }

            if (isPersonalOrganizationForUser({ metadata: organization.metadata, userId })) {
                personalOrganizationIds.add(organization._id);
            } else if (!reusableOrganizationId) {
                reusableOrganizationId = organization._id;
            }
        }

        let organizationId: Id<'organization'>;

        if (reusableOrganizationId) {
            organizationId = reusableOrganizationId;
            const patch: Partial<Doc<'organization'>> = { name: args.organizationName };

            // An undefined patch field would erase the logo the organization already has.
            if (args.organizationLogo) {
                patch.logo = args.organizationLogo;
            }

            await ctx.db.patch('organization', organizationId, patch);
        } else {
            const now = Date.now();
            organizationId = await ctx.db.insert('organization', {
                name: args.organizationName,
                slug: buildOrganizationSlug(args.organizationName),
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

        // Read every session before patching any, so the writes do not affect the iteration.
        const sessions: Doc<'session'>[] = [];

        for await (const session of ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', userId))) {
            sessions.push(session);
        }

        for (const session of sessions) {
            let currentOrganizationId = null;

            if (session.activeOrganizationId) {
                currentOrganizationId = ctx.db.normalizeId(
                    'organization',
                    session.activeOrganizationId
                );
            } else {
                currentOrganizationId = null;
            }

            if (!currentOrganizationId || personalOrganizationIds.has(currentOrganizationId)) {
                await ctx.db.patch('session', session._id, {
                    activeOrganizationId: organizationId,
                });
            }
        }

        const now = Date.now();

        for (const category of categories.values()) {
            await ctx.db.insert('platformCategories', {
                ...category,
                createdAt: now,
                updatedAt: now,
            });

            const sameName = await ctx.db
                .query('categories')
                .withIndex('by_organization_name', q =>
                    q.eq('organizationId', organizationId).eq('name', category.name)
                )
                .first();

            if (!sameName) {
                await ctx.db.insert('categories', {
                    ...category,
                    userId,
                    organizationId,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        await ctx.db.insert('platformSettings', {
            platformName: args.platformName,
            defaultLanguage: args.defaultLanguage,
            registrationPolicy: args.registrationPolicy,
            setupCompletedBy: userId,
        });

        return { organizationId };
    },
});
