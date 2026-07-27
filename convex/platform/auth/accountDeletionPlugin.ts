import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { ActionCtx, MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
type RunnableCtx = MutationCtx | ActionCtx;

async function assertUserIsNotPlatformSetupUser(ctx: GenericCtx, userId: Id<'user'>) {
    const isSetupUser: boolean = await (ctx as RunnableCtx).runQuery(
        internal.setup.isPlatformSetupUserInternal,
        { userId }
    );
    if (isSetupUser) {
        throw new APIError('FORBIDDEN', {
            code: ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN,
            message: 'The platform setup user cannot be deleted.',
        });
    }
}

/**
 * Replaces Better Auth's physical user deletion with the application's bounded
 * soft-delete pipeline. Password verification stays inside Better Auth's HTTP
 * endpoint, so credentials never become Convex function arguments or logs.
 */
export function accountDeletionPlugin(ctx: GenericCtx) {
    return {
        id: 'account-deletion',
        endpoints: {
            softDeleteUser: createAuthEndpoint(
                '/soft-delete-user',
                {
                    method: 'POST',
                    body: z.object({ password: z.string().min(1).max(1024) }),
                    use: [sensitiveSessionMiddleware],
                },
                async endpointCtx => {
                    const userId = endpointCtx.context.session.user.id as Id<'user'>;
                    await assertUserIsNotPlatformSetupUser(ctx, userId);

                    const credentialPasswordHash: string | null = await (
                        ctx as RunnableCtx
                    ).runQuery(internal.auth.getCredentialPasswordHashForDeletion, { userId });
                    const passwordMatches =
                        credentialPasswordHash !== null &&
                        (await endpointCtx.context.password.verify({
                            hash: credentialPasswordHash,
                            password: endpointCtx.body.password,
                        }));

                    if (!passwordMatches) {
                        throw new APIError('BAD_REQUEST', {
                            code: 'INVALID_PASSWORD',
                            message: 'Invalid password',
                        });
                    }

                    await (ctx as RunnableCtx).runMutation(
                        internal.admin.cascadeUserDeletionInternal,
                        {
                            userId,
                            actorUserId: userId,
                        }
                    );
                    deleteSessionCookie(endpointCtx);

                    return endpointCtx.json({ success: true });
                }
            ),
        },
        rateLimit: [
            {
                pathMatcher: path => path === '/soft-delete-user',
                window: 60,
                max: 5,
            },
        ],
    } satisfies BetterAuthPlugin;
}
