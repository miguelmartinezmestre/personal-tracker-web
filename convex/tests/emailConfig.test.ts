import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    getEmailProvider,
    getResendEmailConfig,
    getSmtpEmailConfig,
} from '../platform/email/config';
import { sendWithConfiguredProvider } from '../jobs/email/transactional';
import type { MutationCtx } from '../_generated/server';

describe('email provider configuration', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('defaults to Resend when EMAIL_PROVIDER is omitted', () => {
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
                SMTP_PORT: 'abc',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toThrow('SMTP_PORT must be a valid port number');

        expect(() =>
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '0',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toThrow('SMTP_PORT must be a valid port number');

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

    test('rejects invalid SMTP secure flags and blank required values', () => {
        expect(() =>
            getSmtpEmailConfig({
                EMAIL_PROVIDER: 'smtp',
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '587',
                SMTP_SECURE: 'maybe',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toThrow('SMTP_SECURE must be true or false');

        expect(() =>
            getResendEmailConfig({
                EMAIL_FROM: '   ',
                RESEND_API_KEY: 're_test_key',
            })
        ).toThrow('EMAIL_FROM is required');
    });

    test('queues SMTP email through the configured internal action', async () => {
        const runAfter = vi.fn();
        const ctx = {
            scheduler: { runAfter },
        } as unknown as MutationCtx;

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

        const result = await sendWithConfiguredProvider(ctx, args);

        expect(result).toEqual({ message: 'Email queued successfully', provider: 'smtp' });
        expect(runAfter).toHaveBeenCalledWith(0, expect.anything(), args);
    });
});
