'use node';

import { Resend } from '@convex-dev/resend';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import { env, internalAction } from './_generated/server';
import nodemailer from 'nodemailer';

export type EmailProvider = 'resend' | 'smtp';

export type ResendEmailConfig = {
    provider: 'resend';
    from: string;
    apiKey: string;
};

export type SmtpEmailConfig = {
    provider: 'smtp';
    from: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
};

const DEFAULT_EMAIL_PROVIDER: EmailProvider = 'resend';
const MIN_PORT = 1;
const MAX_PORT = 65535;

type EmailSettings = {
    EMAIL_PROVIDER?: string;
    EMAIL_FROM?: string;
    RESEND_API_KEY?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
};

export function getEmailProvider(source: EmailSettings = env): EmailProvider {
    const provider = (source.EMAIL_PROVIDER?.trim() || DEFAULT_EMAIL_PROVIDER).toLowerCase();

    if (provider === 'resend' || provider === 'smtp') {
        return provider;
    }

    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export function getResendEmailConfig(source: EmailSettings = env): ResendEmailConfig {
    const from = source.EMAIL_FROM?.trim();
    if (!from) {
        throw new Error('EMAIL_FROM is required');
    }

    const apiKey = source.RESEND_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is required');
    }

    return {
        provider: 'resend',
        from,
        apiKey,
    };
}

export function getSmtpEmailConfig(source: EmailSettings = env): SmtpEmailConfig {
    const rawPort = source.SMTP_PORT?.trim();
    if (!rawPort) {
        throw new Error('SMTP_PORT is required');
    }

    const port = Number.parseInt(rawPort, 10);
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
        throw new Error('SMTP_PORT must be a valid port number');
    }

    const rawSecure = source.SMTP_SECURE?.trim() || undefined;
    let secure: boolean;
    if (rawSecure === undefined) {
        secure = port === 465;
    } else {
        const normalized = rawSecure.toLowerCase();
        if (normalized === 'true') {
            secure = true;
        } else if (normalized === 'false') {
            secure = false;
        } else {
            throw new Error('SMTP_SECURE must be true or false');
        }
    }

    const from = source.EMAIL_FROM?.trim();
    if (!from) {
        throw new Error('EMAIL_FROM is required');
    }
    const host = source.SMTP_HOST?.trim();
    if (!host) {
        throw new Error('SMTP_HOST is required');
    }
    const user = source.SMTP_USER?.trim();
    if (!user) {
        throw new Error('SMTP_USER is required');
    }
    const password = source.SMTP_PASSWORD?.trim();
    if (!password) {
        throw new Error('SMTP_PASSWORD is required');
    }

    return {
        provider: 'smtp',
        from,
        host,
        port,
        secure,
        user,
        password,
    };
}

const resend = new Resend(components.resend, {
    apiKey: env.RESEND_API_KEY?.trim() || undefined,
    testMode: false,
});

export const sendTransactionalEmail = internalAction({
    args: {
        to: v.union(v.string(), v.array(v.string())),
        subject: v.string(),
        text: v.optional(v.string()),
        html: v.optional(v.string()),
    },
    returns: v.object({ message: v.string(), provider: v.string() }),
    handler: async (ctx, args) => {
        const provider = getEmailProvider();

        if (provider === 'smtp') {
            getSmtpEmailConfig();
            await ctx.scheduler.runAfter(0, internal.email.sendEmail, args);
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
    },
});

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
