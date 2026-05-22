import { describe, expect, test } from 'vitest';
import {
    getEmailProvider,
    getResendEmailConfig,
    getSmtpEmailConfig,
} from '../platform/email/config';

describe('email provider configuration', () => {
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
    });
});
