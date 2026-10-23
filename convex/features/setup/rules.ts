import { MAX_CHOSEN_CATEGORIES } from '../categories/constants';
import { ConvexError, type ObjectType } from 'convex/values';
import { ERROR_CODES } from '../../shared/errorCodes';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import type { completeSetupArgsValidator } from './validators';

type CompleteSetupArgs = ObjectType<typeof completeSetupArgsValidator>;

export function validateSetupArgs(args: CompleteSetupArgs) {
    if (args.platformName.trim().length === 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    if (args.organizationName.trim().length === 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    if (args.organizationLogo !== undefined) {
        try {
            new URL(args.organizationLogo);
        } catch {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }

    if (args.categories.length > MAX_CHOSEN_CATEGORIES) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

export async function isFirstSetupUser(ctx: MutationCtx, userId: Id<'user'>): Promise<boolean> {
    const firstUser = await ctx.db.query('user').order('asc').first();

    return firstUser?._id === userId;
}
