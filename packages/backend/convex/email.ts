import { internalAction } from './_generated/server';
import { v } from 'convex/values';

/**
 * Email API configuration.
 *
 * The email service is provided by @repo/email-api (Hono + Nodemailer).
 *
 * Required env var:
 * - EMAIL_API_URL: URL of the email API service (default: http://localhost:3001)
 */

function getEmailApiUrl(): string {
    return process.env.EMAIL_API_URL ?? 'http://localhost:3001';
}

type SendEmailResult = { success: boolean; message: string; messageId?: string };

/**
 * Internal helper function to call the email API.
 */
async function callEmailApi(endpoint: string, data: unknown): Promise<SendEmailResult> {
    const apiUrl = getEmailApiUrl();
    const url = `${apiUrl}/api/email/${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = (await response.json()) as SendEmailResult;
        return result;
    } catch (error) {
        console.error('[email] Failed to call email API:', error);
        throw new Error(
            `Failed to call email API: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Send an email using the email API service.
 * This is an internal Convex action that makes HTTP calls to the email service.
 */
export const sendEmail = internalAction({
    args: {
        to: v.string(),
        subject: v.string(),
        text: v.optional(v.string()),
        html: v.optional(v.string()),
    },
    handler: async (_, args): Promise<SendEmailResult> => {
        return callEmailApi('send', args);
    },
});

/**
 * Send a welcome email to a new user.
 */
export const sendWelcomeEmail = internalAction({
    args: {
        to: v.string(),
        username: v.string(),
    },
    handler: async (_, args): Promise<SendEmailResult> => {
        return callEmailApi('welcome', args);
    },
});

/**
 * Send a password reset email.
 */
export const sendPasswordResetEmail = internalAction({
    args: {
        to: v.string(),
        username: v.string(),
        resetUrl: v.string(),
    },
    handler: async (_, args): Promise<SendEmailResult> => {
        return callEmailApi('password-reset', args);
    },
});

/**
 * Send a deadline reminder email.
 */
export const sendDeadlineReminderEmail = internalAction({
    args: {
        to: v.string(),
        username: v.string(),
        objectiveTitle: v.string(),
        deadline: v.number(),
        daysRemaining: v.number(),
    },
    handler: async (_, args): Promise<SendEmailResult> => {
        return callEmailApi('deadline-reminder', args);
    },
});
