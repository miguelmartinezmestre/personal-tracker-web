import { components } from './_generated/api';
import { Resend } from '@convex-dev/resend';
import { internalMutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { getEmailProvider, getResendEmailConfig, getSmtpEmailConfig } from './utils/emailConfig';

export const resend: Resend = new Resend(components.resend, {
    apiKey: process.env.RESEND_API_KEY,
    testMode: false,
});

const transactionalEmailArgs = {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
};

async function sendWithConfiguredProvider(
    ctx: MutationCtx,
    args: {
        to: string | string[];
        subject: string;
        text?: string;
        html?: string;
    }
) {
    const provider = getEmailProvider();

    if (provider === 'smtp') {
        getSmtpEmailConfig();
        await ctx.scheduler.runAfter(0, internal.emailSmtp.sendEmail, args);
        return { message: 'Email queued successfully', provider };
    }

    const config = getResendEmailConfig();
    await resend.sendEmail(ctx, {
        from: config.from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html,
    });
    return { message: 'Email queued successfully', provider };
}

export const sendTransactionalEmail = internalMutation({
    args: transactionalEmailArgs,
    handler: sendWithConfiguredProvider,
});

export const sendTestEmail = internalMutation({
    args: transactionalEmailArgs,
    handler: sendWithConfiguredProvider,
});
