import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { ActionCtx, MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { requireRunnableCtx } from './authRuntime';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;

function isUserId(value: string): value is Id<'user'> {
    return value.length > 0;
}

async function assertUserIsNotPlatformSetupUser(ctx: GenericCtx, userId: Id<'user'>) {
    const runnableCtx = requireRunnableCtx(ctx);
    const isSetupUser = await runnableCtx.runQuery(internal.setup.isPlatformSetupUserInternal, {
        userId,
    });
    if (isSetupUser) {
        throw new APIError('FORBIDDEN', {
            code: ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN,
            message: 'The platform setup user cannot be deleted.',
        });
    }
}

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
                    const rawUserId = endpointCtx.context.session.user.id;
                    if (!isUserId(rawUserId)) {
                        throw new APIError('BAD_REQUEST', {
                            code: 'INVALID_SESSION',
                            message: 'Invalid session',
                        });
                    }
                    const userId = rawUserId;
                    await assertUserIsNotPlatformSetupUser(ctx, userId);

                    const runnableCtx = requireRunnableCtx(ctx);
                    const credentialPasswordHash: string | null = await runnableCtx.runQuery(
                        internal.auth.getCredentialPasswordHashForDeletion,
                        { userId }
                    );
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

                    await runnableCtx.runMutation(internal.cascades.cascadeUserDeletionInternal, {
                        userId,
                        actorUserId: userId,
                    });
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
