import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { getSmtpEmailConfig } from '../features/email/smtpConfig';

// Minimal SMTP server that accepts every command and records the session for assertions.
async function startSmtpSink() {
    const received: string[] = [];

    const server = createServer(socket => {
        let buffer = '';
        let inData = false;
        socket.write('220 sink\r\n');

        socket.on('data', chunk => {
            buffer += chunk.toString();
            let end = buffer.indexOf('\r\n');

            while (end !== -1) {
                const line = buffer.slice(0, end);
                buffer = buffer.slice(end + 2);
                end = buffer.indexOf('\r\n');
                received.push(line);

                if (inData) {
                    if (line === '.') {
                        inData = false;
                        socket.write('250 queued\r\n');
                    }

                    continue;
                }

                const command = line.slice(0, 4).toUpperCase();

                if (command === 'EHLO') socket.write('250-sink\r\n250 AUTH PLAIN\r\n');
                else if (command === 'AUTH') socket.write('235 ok\r\n');
                else if (command === 'DATA') {
                    inData = true;
                    socket.write('354 go\r\n');
                } else if (command === 'QUIT') socket.end('221 bye\r\n');
                else socket.write('250 ok\r\n');
            }
        });
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    // SAFETY: a server listening on a TCP port reports AddressInfo; only pipe servers report a string.
    const { port } = server.address() as AddressInfo;

    return { port, received, close: () => server.close() };
}

describe('SMTP email configuration', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('parses SMTP provider configuration', () => {
        expect(
            getSmtpEmailConfig({
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '465',
                SMTP_SECURE: 'true',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toEqual({
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
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '587',
                SMTP_SECURE: 'false',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            }).secure
        ).toBe(false);
    });

    test('rejects invalid SMTP ports', () => {
        expect(() =>
            getSmtpEmailConfig({
                EMAIL_FROM: 'Metricas <noreply@example.com>',
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '65536',
                SMTP_USER: 'mailer',
                SMTP_PASSWORD: 'secret',
            })
        ).toThrow('SMTP_PORT must be a valid port number');
    });

    test('queues SMTP email and delivers it through the configured server', async () => {
        const smtp = await startSmtpSink();
        vi.stubEnv('EMAIL_FROM', 'Metricas <noreply@example.com>');
        vi.stubEnv('SMTP_HOST', '127.0.0.1');
        vi.stubEnv('SMTP_PORT', String(smtp.port));
        vi.stubEnv('SMTP_USER', 'mailer');
        vi.stubEnv('SMTP_PASSWORD', 'secret');

        const args = {
            to: ['user@example.com'],
            subject: 'Welcome',
            text: 'Hello',
            html: '<p>Hello</p>',
        };

        const t = initConvexTest();
        // Only the scheduler's timers: nodemailer drives the SMTP session with real setImmediate.
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        try {
            const result = await t.mutation(internal.email.sendTransactionalEmail, args);

            const scheduledJobs = await t.run(ctx =>
                ctx.db.system.query('_scheduled_functions').collect()
            );

            expect(result).toEqual({ message: 'Email queued successfully' });
            expect(scheduledJobs).toHaveLength(1);
            expect(scheduledJobs[0]).toMatchObject({
                name: 'emailSmtp:sendEmail',
                state: { kind: 'pending' },
            });
            expect(scheduledJobs[0].args).toEqual([args]);

            // Fires the due scheduler timer only, so nodemailer's socket timeouts never run.
            vi.advanceTimersByTime(0);
            await t.finishInProgressScheduledFunctions();
            expect(smtp.received).toEqual(
                expect.arrayContaining([
                    `AUTH PLAIN ${Buffer.from('\0mailer\0secret').toString('base64')}`,
                    'MAIL FROM:<noreply@example.com>',
                    'RCPT TO:<user@example.com>',
                    'Subject: Welcome',
                ])
            );
        } finally {
            vi.useRealTimers();
            smtp.close();
        }
    });
});
