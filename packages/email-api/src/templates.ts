import { getEmailConfig } from './config';
import type { SendEmailResult } from './mailer';
import { sendEmail } from './mailer';

const APP_NAME = 'Métricas';

export interface EmailData {
    to: string;
}

export interface WelcomeEmailData extends EmailData {
    username: string;
}

export interface PasswordResetEmailData extends EmailData {
    username: string;
    resetUrl: string;
}

export interface DeadlineReminderEmailData extends EmailData {
    username: string;
    objectiveTitle: string;
    deadline: number;
    daysRemaining: number;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<SendEmailResult> {
    const { to, username } = data;
    const { siteUrl } = getEmailConfig();

    const subject = `Welcome to ${APP_NAME}!`;
    const text = `
Hi ${username},

Welcome to ${APP_NAME}! We're excited to have you on board.

You can now start tracking your goals and achievements at: ${siteUrl}/dashboard

If you have any questions, feel free to reach out.

Best regards,
The ${APP_NAME} Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to ${APP_NAME}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333;">Welcome to ${APP_NAME}!</h1>
    <p>Hi ${username},</p>
    <p>We're excited to have you on board.</p>
    <p>You can now start tracking your goals and achievements:</p>
    <p style="margin: 20px 0;">
        <a href="${siteUrl}/dashboard"
           style="background-color: #007bff; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Go to Dashboard
        </a>
    </p>
    <p>If you have any questions, feel free to reach out.</p>
    <p>Best regards,<br>The ${APP_NAME} Team</p>
</body>
</html>
    `.trim();

    return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(
    data: PasswordResetEmailData
): Promise<SendEmailResult> {
    const { to, username, resetUrl } = data;

    const subject = `Reset your ${APP_NAME} password`;
    const text = `
Hi ${username},

You requested to reset your password for your ${APP_NAME} account.

Click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Best regards,
The ${APP_NAME} Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset your password</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333;">Reset your password</h1>
    <p>Hi ${username},</p>
    <p>You requested to reset your password for your ${APP_NAME} account.</p>
    <p>Click the button below to reset your password:</p>
    <p style="margin: 20px 0;">
        <a href="${resetUrl}"
           style="background-color: #dc3545; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
        </a>
    </p>
    <p><small>This link will expire in 1 hour.</small></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Best regards,<br>The ${APP_NAME} Team</p>
</body>
</html>
    `.trim();

    return sendEmail({ to, subject, text, html });
}

export async function sendDeadlineReminderEmail(
    data: DeadlineReminderEmailData
): Promise<SendEmailResult> {
    const { to, username, objectiveTitle, deadline, daysRemaining } = data;
    const { siteUrl } = getEmailConfig();
    const deadlineDate = new Date(deadline).toLocaleDateString();

    const subject = `Reminder: "${objectiveTitle}" deadline approaching`;
    const text = `
Hi ${username},

This is a friendly reminder that your objective "${objectiveTitle}" has a deadline coming up.

Deadline: ${deadlineDate} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining)

Visit your dashboard to update your progress: ${siteUrl}/dashboard

Best regards,
The ${APP_NAME} Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Deadline Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f59e0b;">Deadline Reminder</h1>
    <p>Hi ${username},</p>
    <p>This is a friendly reminder that your objective has a deadline coming up:</p>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #333;">${objectiveTitle}</h2>
        <p style="margin: 0; color: #666;">
            <strong>Deadline:</strong> ${deadlineDate}<br>
            <strong>Time remaining:</strong> ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}
        </p>
    </div>
    <p style="margin: 20px 0;">
        <a href="${siteUrl}/dashboard"
           style="background-color: #007bff; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; display: inline-block;">
            Update Progress
        </a>
    </p>
    <p>Best regards,<br>The ${APP_NAME} Team</p>
</body>
</html>
    `.trim();

    return sendEmail({ to, subject, text, html });
}
