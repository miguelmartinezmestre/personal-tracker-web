import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getEmailConfig, isEmailConfigured } from './config';

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
    if (transporter) {
        return transporter;
    }

    const config = getEmailConfig();

    // If SMTP is not configured, use stream transport for testing
    if (!isEmailConfigured()) {
        transporter = nodemailer.createTransport({
            streamTransport: true,
            buffer: true,
        }) as Transporter;
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
            user: config.smtpUser ?? undefined,
            pass: config.smtpPass ?? undefined,
        },
    });

    return transporter;
}

export type SendEmailResult = { success: boolean; message: string; messageId?: string };

export async function sendEmail(args: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}): Promise<SendEmailResult> {
    const { to, subject, text, html } = args;
    const config = getEmailConfig();

    // Log in development if SMTP is not configured
    if (!isEmailConfigured()) {
        console.log('[email] Email service not configured. Email would be sent:', {
            from: config.from,
            to,
            subject,
            text: text?.substring(0, 100) + (text && text.length > 100 ? '...' : ''),
        });
        return { success: true, message: 'Email logged (service not configured)' };
    }

    try {
        const transport = getTransporter();
        const info = await transport.sendMail({
            from: config.from,
            to,
            subject,
            text,
            html,
        });

        return {
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
        };
    } catch (error) {
        console.error('[email] Failed to send email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function verifyConnection(): Promise<boolean> {
    if (!isEmailConfigured()) {
        return false;
    }

    try {
        const transport = getTransporter();
        await transport.verify();
        return true;
    } catch {
        return false;
    }
}
