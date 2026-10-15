import { v } from 'convex/values';
import { internal } from './_generated/api';
import { env, internalMutation } from './_generated/server';

export type SmtpEmailConfig = {
    from: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
};

const MIN_PORT = 1;
const MAX_PORT = 65535;

type EmailSettings = {
    EMAIL_FROM?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
};

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
        from,
        host,
        port,
        secure,
        user,
        password,
    };
}

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
