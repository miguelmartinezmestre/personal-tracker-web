import { internalMutation } from './_generated/server';
import {
    resend,
    sendWithConfiguredProvider,
    transactionalEmailArgs,
} from './jobs/email/transactional';

export { resend };

export const sendTransactionalEmail = internalMutation({
    args: transactionalEmailArgs,
    handler: sendWithConfiguredProvider,
});

export const sendTestEmail = internalMutation({
    args: transactionalEmailArgs,
    handler: sendWithConfiguredProvider,
});
