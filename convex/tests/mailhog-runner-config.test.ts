import { describe, expect, test } from 'vitest';
import { DEFAULT_MAILHOG_SMTP_ENV, buildMailhogConvexEnv } from '../../scripts/lib/mailhog-email';

describe('MailHog runner email configuration', () => {
    test('defines the Convex SMTP env vars used by local and e2e runners', () => {
        expect(DEFAULT_MAILHOG_SMTP_ENV).toEqual({
            EMAIL_PROVIDER: 'smtp',
            EMAIL_FROM: 'Metricas <noreply@metricas.local>',
            SMTP_HOST: 'mailhog',
            SMTP_PORT: '1025',
            SMTP_SECURE: 'false',
            SMTP_USER: 'mailhog',
            SMTP_PASSWORD: 'mailhog',
        });
    });

    test('merges MailHog defaults over the current process env for Convex commands', () => {
        expect(
            buildMailhogConvexEnv({
                EMAIL_PROVIDER: 'resend',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                EXTRA_VALUE: 'kept',
            })
        ).toMatchObject({
            EMAIL_PROVIDER: 'smtp',
            EMAIL_FROM: 'Metricas <noreply@metricas.local>',
            SMTP_HOST: 'mailhog',
            SMTP_PORT: '1025',
            SMTP_SECURE: 'false',
            SMTP_USER: 'mailhog',
            SMTP_PASSWORD: 'mailhog',
            EXTRA_VALUE: 'kept',
        });
    });
});
