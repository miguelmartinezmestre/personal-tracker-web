'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import nodemailer from 'nodemailer';
import { getSmtpEmailConfig } from './features/email/smtpConfig';

export const sendEmail = internalAction({
    args: {
        to: v.union(v.string(), v.array(v.string())),
        subject: v.string(),
        text: v.optional(v.string()),
        html: v.optional(v.string()),
    },
    returns: v.object({ message: v.string() }),
    handler: async (_, args) => {
        const config = getSmtpEmailConfig();

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        });

        await transporter.sendMail({
            from: config.from,
            to: args.to,
            subject: args.subject,
            text: args.text,
            html: args.html,
        });

        return { message: 'Email sent successfully' };
    },
});
