import { getSmtpEmailConfig } from './features/email/smtpConfig';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

// A mutation, not a Node action: on a self-hosted backend a Node action reaches the scheduler
// through CONVEX_CLOUD_ORIGIN, which is the host-facing URL and is not reachable from inside the
// container when the published port differs (as in the e2e stack). Only the SMTP delivery itself
// needs Node, and it makes no calls back into Convex.
export const sendTransactionalEmail = internalMutation({
    args: {
        to: v.union(v.string(), v.array(v.string())),
        subject: v.string(),
        text: v.optional(v.string()),
        html: v.optional(v.string()),
    },
    returns: v.object({ message: v.string() }),
    handler: async (ctx, args) => {
        // Fails here, inside the caller's transaction, instead of later in the scheduled action.
        getSmtpEmailConfig();
        await ctx.scheduler.runAfter(0, internal.emailSmtp.sendEmail, args);

        return { message: 'Email queued successfully' };
    },
});
