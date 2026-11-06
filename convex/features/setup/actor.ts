import { ConvexError } from 'convex/values';
import type { QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { resolveAuthContext } from '../authorization/authContext';

/** Setup grants the global admin role, so it requires a live session, like every other call. */
export async function requireSetupUserId(ctx: QueryCtx): Promise<string> {
    try {
        return (await resolveAuthContext(ctx)).userId;
    } catch (error) {
        if (error instanceof ConvexError && error.data === ERROR_CODES.AUTH_REQUIRED) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }

        throw error;
    }
}
