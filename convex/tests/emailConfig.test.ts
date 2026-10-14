import { afterEach, describe, expect, test, vi } from 'vitest';
import resendTest from '@convex-dev/resend/test';
import nodemailer from 'nodemailer';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { getEmailProvider, getResendEmailConfig, getSmtpEmailConfig } from '../email';

const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: 'test-message' })));
vi.mock('nodemailer', () => ({
    default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

describe('email provider configuration', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
    });

    test('defaults to Resend when EMAIL_PROVIDER is absent', () => {
        expect(getEmailProvider({})).toBe('resend');
    });

    test('requires Resend API key and sender for Resend provider', () => {
        expect(() =>
            getResendEmailConfig({ EMAIL_FROM: 'Metricas <noreply@example.com>' })
        ).toThrow('RESEND_API_KEY is required');

        expect(
            getResendEmailConfig({
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                RESEND_API_KEY: 're_test_key',
            })
        ).toEqual({
            provider: 'resend',
            from: 'Metricas <noreply@example.com>',
            apiKey: 're_test_key',
        });
    });

    test('parses SMTP provider configuration', () => {
        expect(
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '465',
                SMTP_SECURE: 'true',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toEqual({
            provider: 'smtp',
            from: 'Metricas <noreply@example.com>',
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            user: 'mailer',
            password: 'secret',
        });
    });

    test('defaults SMTP secure mode from port 465', () => {
        expect(
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '465',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            }).secure
        ).toBe(true);
    });

    test('parses explicit non-secure SMTP mode', () => {
        expect(
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '587',
                SMTP_SECURE: 'false',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            }).secure
        ).toBe(false);
    });

    test('rejects unsupported email providers and invalid SMTP ports', () => {
        expect(() => getEmailProvider({ EMAIL_PROVIDER: 'mailgun' })).toThrow(
            'Unsupported EMAIL_PROVIDER: mailgun'
        );

        expect(() =>
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '65536',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toThrow('SMTP_PORT must be a valid port number');
    });

    test('queues SMTP email through the configured internal action', async () => {
        vi.stubEnv('EMAIL_PROVIDER', 'smtp');
        vi.stubEnv('EMAIL_FROM', 'Metricas <noreply@example.com>');
        vi.stubEnv('SMTP_HOST', 'smtp.example.com');
        vi.stubEnv('SMTP_PORT', '587');
        vi.stubEnv('SMTP_USER', 'mailer');
        vi.stubEnv('SMTP_PASSWORD', 'secret');

        const args = {
            to: ['user@example.com'],
            subject: 'Welcome',
            text: 'Hello',
            html: '<p>Hello</p>',
        };

        const t = initConvexTest();
        vi.useFakeTimers();
        try {
            const result = await t.mutation(internal.email.sendTransactionalEmail, args);
            const scheduledJobs = await t.run(ctx =>
                ctx.db.system.query('_scheduled_functions').collect()
            );

            expect(result).toEqual({ message: 'Email queued successfully', provider: 'smtp' });
            expect(scheduledJobs).toHaveLength(1);
            expect(scheduledJobs[0]).toMatchObject({
                name: 'emailSmtp:sendEmail',
                state: { kind: 'pending' },
            });
            expect(scheduledJobs[0].args).toEqual([args]);

            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: 'smtp.example.com',
                port: 587,
                secure: false,
                auth: { user: 'mailer', pass: 'secret' },
            });
            expect(sendMail).toHaveBeenCalledWith({
                from: 'Metricas <noreply@example.com>',
                ...args,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    test('queues Resend email for real recipients in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('SITE_URL', 'https://app.example.com');
        vi.stubEnv('BETTER_AUTH_URL', 'https://app.example.com');
        vi.stubEnv('SETUP_SECRET', 's'.repeat(32));
        vi.stubEnv('EMAIL_PROVIDER', 'resend');
        vi.stubEnv('EMAIL_FROM', 'Metricas <noreply@example.com>');
        vi.stubEnv('RESEND_API_KEY', 're_test_key');
        vi.resetModules();

        const t = initConvexTest();
        resendTest.register(t);
        vi.useFakeTimers();
        try {
            await expect(
                t.mutation(internal.email.sendTransactionalEmail, {
                    to: 'user@example.com',
                    subject: 'Welcome',
                    text: 'Hello',
                })
            ).resolves.toEqual({ message: 'Email queued successfully', provider: 'resend' });
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
            vi.resetModules();
        }
    });
});
