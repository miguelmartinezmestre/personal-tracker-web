import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { GLOBAL_ADMIN_ROLE, USER_ROLE, isGlobalAdminRole } from './roles';

export function isActiveAccount(
    user: { banned?: boolean | null; banExpires?: number | null; deletedAt?: number } | null,
    now: number
): boolean {
    return (
        user !== null &&
        user.deletedAt === undefined &&
        !(user.banned === true && (user.banExpires == null || user.banExpires > now))
    );
}

export function normalizeRegistrationEmail(email: string) {
    return email.trim().toLowerCase();
}

// An admin never changes their own role or ban, so the platform can't lose its last admin.
export async function requireOtherUser(
    ctx: { role: string; userId: Id<'user'>; db: MutationCtx['db'] },
    userId: Id<'user'>
) {
    if (!isGlobalAdminRole(ctx.role)) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    const user = await ctx.db.get('user', userId);

    if (!user || user.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    if (user._id === ctx.userId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    return user;
}

export function toAdminUser(user: Doc<'user'>) {
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
