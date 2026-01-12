/**
 * Email configuration from environment variables.
 *
 * Required env vars for production:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - EMAIL_FROM: Default sender email address
 *
 * Optional env vars:
 * - SITE_URL: Base URL for the application (default: http://localhost:3000)
 *
 * For development, emails will be logged to console if SMTP is not configured.
 */

export interface EmailConfig {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPass: string | null;
    from: string;
    siteUrl: string;
}

export function getEmailConfig(): EmailConfig {
    return {
        smtpHost: process.env.SMTP_HOST ?? 'localhost',
        smtpPort: Number(process.env.SMTP_PORT) ?? 587,
        smtpSecure: process.env.SMTP_SECURE === 'true',
        smtpUser: process.env.SMTP_USER ?? null,
        smtpPass: process.env.SMTP_PASS ?? null,
        from: process.env.EMAIL_FROM ?? 'no-reply@metricas.local',
        siteUrl: process.env.SITE_URL ?? 'http://localhost:3000',
    };
}

export function isEmailConfigured(): boolean {
    const config = getEmailConfig();
    return !!config.smtpUser && !!config.smtpPass;
}
