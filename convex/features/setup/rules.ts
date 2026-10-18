import {
    CATEGORY_COLOR_PATTERN,
    CATEGORY_ICONS,
    CATEGORY_NAME_MAX_LENGTH,
} from '../categories/constants';
import { ConvexError, type ObjectType } from 'convex/values';
import { ERROR_CODES } from '../../shared/errorCodes';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import type { completeSetupArgsValidator } from './validators';

const SETUP_LIMITS = {
    NAME_MAX: 100,
    CATEGORY_NAME_MAX: CATEGORY_NAME_MAX_LENGTH,
    CATEGORIES_MAX: 100,
} as const;

const CATEGORY_ICON_SET = new Set<string>(CATEGORY_ICONS);

type CompleteSetupArgs = ObjectType<typeof completeSetupArgsValidator>;

export function validateSetupArgs(args: CompleteSetupArgs) {
    if (args.platformName.trim().length === 0 || args.platformName.length > SETUP_LIMITS.NAME_MAX) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    if (
        args.organizationName.trim().length === 0 ||
        args.organizationName.length > SETUP_LIMITS.NAME_MAX
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    if (args.organizationLogo !== undefined) {
        try {
            new URL(args.organizationLogo);
        } catch {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }

    if (args.categories.length > SETUP_LIMITS.CATEGORIES_MAX) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }

    for (const category of args.categories) {
        if (
            category.name.trim().length === 0 ||
            category.name.length > SETUP_LIMITS.CATEGORY_NAME_MAX ||
            !CATEGORY_COLOR_PATTERN.test(category.color) ||
            (category.icon !== undefined && !CATEGORY_ICON_SET.has(category.icon))
        ) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }
}

export async function isFirstSetupUser(ctx: MutationCtx, userId: Id<'user'>): Promise<boolean> {
    const firstUser = await ctx.db.query('user').order('asc').first();

    return firstUser?._id === userId;
}
