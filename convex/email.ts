import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import {
    resend,
    sendWithConfiguredProvider,
    transactionalEmailArgs,
} from './jobs/email/transactional';

export { resend };

export const sendTransactionalEmail = internalMutation({
    args: transactionalEmailArgs,
    returns: v.object({ message: v.string(), provider: v.string() }),
    handler: sendWithConfiguredProvider,
});
