'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { sendSmtpEmailJob } from './jobs/email/smtpDelivery';

export const sendEmail = internalAction({
    args: {
        to: v.union(v.string(), v.array(v.string())),
        subject: v.string(),
        text: v.optional(v.string()),
        html: v.optional(v.string()),
    },
    returns: v.object({ message: v.string() }),
    handler: async (_, args) => {
        return await sendSmtpEmailJob(args);
    },
});
