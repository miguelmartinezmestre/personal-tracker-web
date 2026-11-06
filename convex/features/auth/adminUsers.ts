import { ConvexError, type Infer } from 'convex/values';
import type { PaginationOptions } from 'convex/server';
import type { Doc } from '../../_generated/dataModel';
import { ERROR_CODES } from '../../shared/errorCodes';
import { withPaginationLimits } from '../../shared/pagination';
import { getUser, type AuthReader, type AuthWriter } from './authRecords';
import { GLOBAL_ADMIN_ROLE, USER_ROLE, isGlobalAdminRole } from './roles';
import type { platformRoleValidator } from './validators';

type PlatformRole = Infer<typeof platformRoleValidator>;

function toAdminUser(user: Doc<'user'>) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: isGlobalAdminRole(user.role) ? GLOBAL_ADMIN_ROLE : USER_ROLE,
        banned: user.banned === true,
        banReason: user.banReason ?? null,
        banExpires: user.banExpires ?? null,
        createdAt: user.createdAt,
    };
}

export async function listAdminUsers(
    ctx: AuthReader,
    args: { search?: string; paginationOpts: PaginationOptions }
) {
    const search = args.search?.trim();
    const users = ctx.db.query('user');
    const paginationOpts = withPaginationLimits(args.paginationOpts);
    let result;

    if (!search) {
        result = await users.withIndex('email_name').paginate(paginationOpts);
    } else if (search.includes('@')) {
        result = await users
            .withSearchIndex('search_user_email', q => q.search('email', search))
            .paginate(paginationOpts);
    } else {
        result = await users
            .withSearchIndex('search_user_name', q => q.search('name', search))
            .paginate(paginationOpts);
    }

    return {
        ...result,
        page: result.page.filter(user => user.deletedAt === undefined).map(toAdminUser),
    };
}

export async function isFirstUser(ctx: AuthReader, userId: string) {
    const firstUser = await ctx.db.query('user').order('asc').first();

    return firstUser?._id === userId;
}

/** A live account other than the caller's, for admin actions. */
async function requireOtherUser(ctx: AuthReader, userId: string, actorUserId: string) {
    const user = await getUser(ctx, userId);

    if (!user || user.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    if (user._id === actorUserId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    return user;
}

export async function setPlatformRole(
    ctx: AuthWriter,
    args: { userId: string; actorUserId: string; role: PlatformRole }
) {
    const user = await requireOtherUser(ctx, args.userId, args.actorUserId);
    await ctx.db.patch('user', user._id, { role: args.role, updatedAt: Date.now() });

    return { id: user._id, role: user.role ?? null, updatedAt: user.updatedAt };
}

/** Grants the platform role during setup; the caller has already checked it may. */
export async function grantPlatformRole(ctx: AuthWriter, userId: string, role: PlatformRole) {
    const user = await getUser(ctx, userId);

    if (!user) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    await ctx.db.patch('user', user._id, { role });
}

export async function banAccount(
    ctx: AuthWriter,
    args: {
        userId: string;
        actorUserId: string;
        reason: string | null;
        banExpires: number | null;
    }
) {
    const user = await requireOtherUser(ctx, args.userId, args.actorUserId);
    const banUpdatedAt = Math.max(Date.now(), user.updatedAt + 1);

    await ctx.db.patch('user', user._id, {
        banned: true,
        banReason: args.reason,
        banExpires: args.banExpires,
        updatedAt: banUpdatedAt,
    });

    return { id: user._id, banUpdatedAt };
}

export async function unbanAccount(ctx: AuthWriter, args: { userId: string; actorUserId: string }) {
    const user = await requireOtherUser(ctx, args.userId, args.actorUserId);

    await ctx.db.patch('user', user._id, {
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: Math.max(Date.now(), user.updatedAt + 1),
    });

    return { id: user._id };
}
