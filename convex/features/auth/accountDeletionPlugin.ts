import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { internal } from '../../_generated/api';
import type { ActionCtx, MutationCtx, QueryCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { requireRunnableCtx } from '../../shared/ctx';
import type { AccountDeletionBlocker } from './accountDeletion';

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;

function throwDeletionBlocked(blocker: AccountDeletionBlocker): never {
    if (blocker === 'setupUser') {
        throw new APIError('FORBIDDEN', {
            code: ERROR_CODES.SETUP_USER_DELETE_FORBIDDEN,
            message: 'The platform setup user cannot be deleted.',
        });
    }

    throw new APIError('FORBIDDEN', {
        code: ERROR_CODES.OWNER_SUCCESSOR_REQUIRED,
        message: 'Choose a new owner for the organizations you own first.',
    });
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

                    if (rawUserId.length === 0) {
                        throw new APIError('BAD_REQUEST', {
                            code: 'INVALID_SESSION',
                            message: 'Invalid session',
                        });
                    }

                    const runnableCtx = requireRunnableCtx(ctx);

                    const target = await runnableCtx.runQuery(
                        internal.auth.getAccountDeletionTarget,
                        {
                            userId: rawUserId,
                        }
                    );

                    if (!target) {
                        throw new APIError('BAD_REQUEST', {
                            code: 'INVALID_USER',
                            message: 'Invalid user',
                        });
                    }

                    if (target.isSetupUser) {
                        throwDeletionBlocked('setupUser');
                    }

                    if (target.organizationsNeedingNewOwner.length > 0) {
                        throwDeletionBlocked('ownerSuccessorRequired');
                    }

                    const passwordMatches =
                        target.passwordHash !== null &&
                        (await endpointCtx.context.password.verify({
                            hash: target.passwordHash,
                            password: endpointCtx.body.password,
                        }));

                    if (!passwordMatches) {
                        throw new APIError('BAD_REQUEST', {
                            code: 'INVALID_PASSWORD',
                            message: 'Invalid password',
                        });
                    }

                    const outcome = await runnableCtx.runMutation(
                        internal.cascades.cascadeUserDeletionInternal,
                        { userId: target.userId }
                    );

                    if (outcome !== 'deleted') {
                        throwDeletionBlocked(outcome);
                    }

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
