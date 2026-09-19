import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { isGlobalAdminRole } from '../../../shared/platform-roles';
import { isActiveAccount } from '../../domain/organizations/operational';

export async function isPlatformSetupUser(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy === userId;
}

export async function getPlatformSetupUserId(ctx: { db: DatabaseReader }) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy ?? null;
}

export async function requireAdminUser(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    const user = await ctx.db.get('user', userId);
    if (!user || !isActiveAccount(user, Date.now()) || !isGlobalAdminRole(user.role)) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    return user;
}
