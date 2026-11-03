import { ConvexError } from 'convex/values';
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server';
import { ERROR_CODES } from './errorCodes';

export type GenericCtx = QueryCtx | MutationCtx | ActionCtx;

export type RunnableCtx = MutationCtx | ActionCtx;

export function isRunnableCtx(ctx: GenericCtx): ctx is RunnableCtx {
    return 'runMutation' in ctx;
}

export function isMutationCtx(ctx: GenericCtx): ctx is MutationCtx {
    return 'runMutation' in ctx && 'db' in ctx && 'scheduler' in ctx;
}

export function requireRunnableCtx(ctx: GenericCtx): RunnableCtx {
    if (!isRunnableCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    return ctx;
}

export function requireMutationCtx(ctx: GenericCtx): MutationCtx {
    if (!isMutationCtx(ctx)) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    return ctx;
}
