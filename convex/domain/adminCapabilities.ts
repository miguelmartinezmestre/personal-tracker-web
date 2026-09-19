import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { requireAdmin } from '../utils/requiredAdmin';
import { isPlatformSetupUser } from '../platform/admin/access';
import { ERROR_CODES } from '../utils/constants';
import { GLOBAL_ADMIN_ROLE } from '../../shared/platform-roles';
import { isActiveAccount } from './organizations/operational';

type AdminOperation = 'update' | 'ban' | 'unban' | 'delete' | 'sessions';

export async function assertAnotherActiveAdministrator(
    ctx: QueryCtx | MutationCtx,
    target: Doc<'user'>
): Promise<void> {
    if (target.role !== GLOBAL_ADMIN_ROLE || !isActiveAccount(target, Date.now())) {
        return;
    }
    for await (const candidate of ctx.db
        .query('user')
        .withIndex('by_role', q => q.eq('role', GLOBAL_ADMIN_ROLE))) {
        if (candidate._id !== target._id && isActiveAccount(candidate, Date.now())) {
            return;
        }
    }
    throw new ConvexError(ERROR_CODES.FORBIDDEN);
}

export async function requireAdminTarget(
    ctx: MutationCtx & { userId: Id<'user'> },
    userId: Id<'user'>,
    operation: AdminOperation,
    nextRole?: string
) {
    await requireAdmin(ctx);
    const target = await ctx.db.get('user', userId);
    if (!target || (target.deletedAt !== undefined && operation !== 'delete')) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }
    const changesRole =
        operation === 'update' && nextRole !== undefined && target.role !== nextRole;
    const removesAccess =
        operation === 'ban' ||
        operation === 'delete' ||
        (changesRole && nextRole !== GLOBAL_ADMIN_ROLE);
    if (removesAccess && (await isPlatformSetupUser(ctx, userId))) {
        let code: string = ERROR_CODES.FORBIDDEN;
        if (operation === 'ban') {
            code = ERROR_CODES.SETUP_USER_BAN_FORBIDDEN;
        }
        if (operation === 'delete') {
            code = ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN;
        }
        throw new ConvexError(code);
    }
    if ((changesRole || removesAccess) && userId === ctx.userId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    if (removesAccess) {
        await assertAnotherActiveAdministrator(ctx, target);
    }
    return target;
}
