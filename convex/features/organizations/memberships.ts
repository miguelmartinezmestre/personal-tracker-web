import { ConvexError } from 'convex/values';
import type { PaginationOptions } from 'convex/server';
import type { Doc } from '../../_generated/dataModel';
import { ERROR_CODES } from '../../shared/errorCodes';
import { withNextPageCheck, withPaginationLimits } from '../../shared/pagination';
import {
    getMembership,
    getOrganization,
    getUser,
    type AuthReader,
    type AuthWriter,
} from '../auth/authRecords';
import {
    DEFAULT_ORGANIZATION_NAME,
    buildDefaultOrganizationSlug,
    buildPersonalOrganizationMetadata,
    getPersonalOrganizationOwnerUserId,
    isPersonalOrganizationForUser,
} from './personalOrganization';
import { normalizeOrganizationName } from './slug';
import { normalizeOrganizationRole } from './roles';

export async function listUserMemberships(ctx: AuthReader, userId: string) {
    const id = ctx.db.normalizeId('user', userId);

    if (!id) {
        return [];
    }

    const memberships = [];

    for await (const membership of ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', id))) {
        memberships.push(membership);
    }

    return memberships;
}

async function toOrganizationSummaries(
    ctx: AuthReader,
    userId: string,
    memberships: Doc<'member'>[]
) {
    const organizations = await Promise.all(
        memberships.map(async member => {
            const org = await getOrganization(ctx, member.organizationId);

            if (!org) {
                return null;
            }

            return {
                id: org._id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                createdAt: org.createdAt,
                role: normalizeOrganizationRole(member.role),
                isPersonal: isPersonalOrganizationForUser({ metadata: org.metadata, userId }),
            };
        })
    );

    return organizations.filter(organization => organization !== null);
}

export async function listOrganizationsForUser(
    ctx: AuthReader,
    userId: string,
    paginationOpts: PaginationOptions
) {
    const id = ctx.db.normalizeId('user', userId);

    if (!id) {
        return { page: [], isDone: true, continueCursor: '' };
    }

    const result = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', id))
        .order('desc')
        .paginate(withPaginationLimits(paginationOpts));

    return await withNextPageCheck(
        ctx.db,
        {
            table: 'member',
            index: 'userId',
            prefix: [id],
            indexKey: doc => [doc.userId],
            paginationOpts,
        },
        result,
        await toOrganizationSummaries(ctx, userId, result.page)
    );
}

/** Every membership of the user in an existing organization, with its personal flag. */
export async function listMembershipsForUser(ctx: AuthReader, userId: string) {
    const memberships = [];

    for (const membership of await listUserMemberships(ctx, userId)) {
        const organization = await getOrganization(ctx, membership.organizationId);

        if (organization) {
            memberships.push({
                organizationId: organization._id,
                role: membership.role,
                isPersonal: isPersonalOrganizationForUser({
                    metadata: organization.metadata,
                    userId,
                }),
            });
        }
    }

    return memberships;
}

function findOrganizationBySlug(ctx: AuthReader, slug: string) {
    return ctx.db
        .query('organization')
        .withIndex('slug', q => q.eq('slug', slug))
        .first();
}

export async function findOrganizationByIdentifier(
    ctx: AuthReader,
    identifier: string,
    userId: string
) {
    const value = identifier.trim();

    const org = (await getOrganization(ctx, value)) ?? (await findOrganizationBySlug(ctx, value));

    if (!org) {
        return null;
    }

    const member = await getMembership(ctx, org._id, userId);

    if (!member) {
        return null;
    }

    return (await toOrganizationSummaries(ctx, userId, [member])).at(0) ?? null;
}

export async function userHasOrganizationNamed(
    ctx: AuthReader,
    args: { userId: string; name: string; excludeOrganizationId?: string }
) {
    const wanted = normalizeOrganizationName(args.name);

    for (const membership of await listUserMemberships(ctx, args.userId)) {
        if (membership.organizationId === args.excludeOrganizationId) {
            continue;
        }

        const organization = await getOrganization(ctx, membership.organizationId);

        if (organization && normalizeOrganizationName(organization.name) === wanted) {
            return true;
        }
    }

    return false;
}

/** A personal organization whose owner still owns it cannot be deleted, shared or renamed. */
export async function isDefaultOrganization(ctx: AuthReader, organizationId: string) {
    const organization = await getOrganization(ctx, organizationId);
    const ownerUserId = getPersonalOrganizationOwnerUserId(organization?.metadata);

    if (!organization || !ownerUserId) {
        return false;
    }

    return (await getMembership(ctx, organization._id, ownerUserId))?.role === 'owner';
}

export async function findPersonalOrganization(ctx: AuthReader, userId: string) {
    const bySlug = await findOrganizationBySlug(ctx, buildDefaultOrganizationSlug(userId));

    if (bySlug && isPersonalOrganizationForUser({ metadata: bySlug.metadata, userId })) {
        return bySlug;
    }

    for (const membership of await listUserMemberships(ctx, userId)) {
        const organization = await getOrganization(ctx, membership.organizationId);

        if (
            organization &&
            isPersonalOrganizationForUser({ metadata: organization.metadata, userId })
        ) {
            return organization;
        }
    }

    return null;
}

async function buildAvailablePersonalOrganizationSlug(ctx: AuthReader, userId: string) {
    const baseSlug = buildDefaultOrganizationSlug(userId);
    let candidate = baseSlug;

    for (let attempt = 0; attempt < 5; attempt++) {
        if (!(await findOrganizationBySlug(ctx, candidate))) {
            return candidate;
        }

        candidate = `${baseSlug}-${Date.now().toString(36)}-${attempt + 1}`;
    }

    throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
}

async function createOwnedOrganization(
    ctx: AuthWriter,
    userId: string,
    organization: Pick<Doc<'organization'>, 'name' | 'slug' | 'metadata' | 'logo'>
) {
    const ownerId = ctx.db.normalizeId('user', userId);

    if (!ownerId) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    const now = Date.now();
    const organizationId = await ctx.db.insert('organization', { ...organization, createdAt: now });

    await ctx.db.insert('member', {
        organizationId,
        userId: ownerId,
        role: 'owner',
        createdAt: now,
    });

    return organizationId;
}

export async function createPersonalOrganization(ctx: AuthWriter, userId: string) {
    return await createOwnedOrganization(ctx, userId, {
        name: DEFAULT_ORGANIZATION_NAME,
        slug: await buildAvailablePersonalOrganizationSlug(ctx, userId),
        metadata: buildPersonalOrganizationMetadata(userId),
        logo: null,
    });
}

/** The organization a new session starts in: the user's first one, creating the personal one. */
export async function ensureDefaultOrganizationForUser(ctx: AuthWriter, userId: string) {
    const user = await getUser(ctx, userId);

    if (!user) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    let firstOrganizationId: Doc<'organization'>['_id'] | null = null;

    for (const membership of await listUserMemberships(ctx, user._id)) {
        const organization = await getOrganization(ctx, membership.organizationId);

        if (!organization) {
            continue;
        }

        if (isPersonalOrganizationForUser({ metadata: organization.metadata, userId: user._id })) {
            return firstOrganizationId ?? organization._id;
        }

        firstOrganizationId ??= organization._id;
    }

    const organizationId = await createPersonalOrganization(ctx, user._id);

    return firstOrganizationId ?? organizationId;
}

/** Setup either renames the first shared organization of the user or creates one it owns. */
export async function upsertSetupOrganization(
    ctx: AuthWriter,
    args: {
        userId: string;
        reuseOrganizationId: string | null;
        name: string;
        slug: string;
        logo?: string;
    }
) {
    const reusable = await getOrganization(ctx, args.reuseOrganizationId);

    if (reusable) {
        // An undefined patch field would erase the logo the organization already has.
        await ctx.db.patch('organization', reusable._id, {
            name: args.name,
            ...(args.logo ? { logo: args.logo } : {}),
        });

        return reusable._id;
    }

    return await createOwnedOrganization(ctx, args.userId, {
        name: args.name,
        slug: args.slug,
        metadata: null,
        logo: args.logo ?? null,
    });
}

export async function removeOrganization(ctx: AuthWriter, organizationId: string) {
    const organization = await getOrganization(ctx, organizationId);

    if (!organization) {
        return false;
    }

    await ctx.db.delete('organization', organization._id);

    return true;
}

/** Which of `userIds` are members of the organization (its existence is not checked). */
export async function filterMembers(ctx: AuthReader, organizationId: string, userIds: string[]) {
    const members = [];

    for (const userId of new Set(userIds)) {
        if (await getMembership(ctx, organizationId, userId)) {
            members.push(userId);
        }
    }

    return members;
}

export async function listOrganizationMembers(
    ctx: AuthReader,
    args: { organizationId: string; requesterId: string; paginationOpts: PaginationOptions }
) {
    const organizationId = ctx.db.normalizeId('organization', args.organizationId);

    if (!organizationId || !(await getMembership(ctx, organizationId, args.requesterId))) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    const members = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .order('desc')
        .paginate(withPaginationLimits(args.paginationOpts));

    const userIds = [...new Set(members.page.map(member => member.userId))];
    const users = await Promise.all(userIds.map(id => getUser(ctx, id)));
    const userMap = new Map(users.filter(user => user !== null).map(user => [user._id, user]));

    const page = members.page.map(member => {
        const user = userMap.get(member.userId);

        return {
            id: member._id,
            organizationId: member.organizationId,
            userId: member.userId,
            role: normalizeOrganizationRole(member.role),
            createdAt: member.createdAt,
            user: user ? { email: user.email, name: user.name, image: user.image } : null,
        };
    });

    return await withNextPageCheck(
        ctx.db,
        {
            table: 'member',
            index: 'organizationId',
            prefix: [organizationId],
            indexKey: doc => [doc.organizationId],
            paginationOpts: args.paginationOpts,
        },
        members,
        page
    );
}

/** One page of an organization's members, for background fan-out. */
export async function pageMembers(
    ctx: AuthReader,
    args: { organizationId: string; numItems: number; cursor: string | null }
) {
    const organizationId = ctx.db.normalizeId('organization', args.organizationId);

    if (!organizationId) {
        return { page: [], isDone: true, continueCursor: '' };
    }

    const result = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .paginate({ numItems: args.numItems, cursor: args.cursor });

    return {
        page: result.page.map(member => ({ userId: member.userId, role: member.role })),
        isDone: result.isDone,
        continueCursor: result.continueCursor,
    };
}

export async function deleteMembersBatch(
    ctx: AuthWriter,
    organizationId: string,
    batchSize: number
) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id) {
        return 0;
    }

    const rows = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', id))
        .take(batchSize);

    for (const row of rows) {
        await ctx.db.delete('member', row._id);
    }

    return rows.length;
}

/**
 * Removes up to `batchSize` memberships of a deleted account. An organization left without
 * other members, or the account's personal one, is deleted with it; the caller cascades those.
 */
export async function deleteUserMembershipsBatch(
    ctx: AuthWriter,
    userId: string,
    batchSize: number
) {
    const id = ctx.db.normalizeId('user', userId);
    const deletedOrganizationIds: Doc<'organization'>['_id'][] = [];

    if (!id) {
        return { deleted: 0, deletedOrganizationIds };
    }

    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', id))
        .take(batchSize);

    for (const membership of memberships) {
        const organization = await getOrganization(ctx, membership.organizationId);

        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', membership.organizationId))
            .take(2);

        const isLastMember = members.every(member => member.userId === id);

        if (
            organization &&
            (isLastMember ||
                isPersonalOrganizationForUser({ metadata: organization.metadata, userId }))
        ) {
            await ctx.db.delete('organization', organization._id);
            deletedOrganizationIds.push(organization._id);
        }

        await ctx.db.delete('member', membership._id);
    }

    return { deleted: memberships.length, deletedOrganizationIds };
}

export async function hasMembers(ctx: AuthReader, organizationId: string) {
    const id = ctx.db.normalizeId('organization', organizationId);

    if (!id) {
        return false;
    }

    const member = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', id))
        .first();

    return member !== null;
}
