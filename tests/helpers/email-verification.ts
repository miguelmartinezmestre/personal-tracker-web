import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { z } from 'zod';

type EmailKind = 'verify-email' | 'reset-password' | 'invitation';

const maildevEmailSchema = z.object({
    time: z.string().catch(''),
    to: z.array(z.object({ address: z.string().catch('') })).catch([]),
    text: z.string().catch(''),
    html: z.string().catch(''),
});

const maildevEmailListSchema = z
    .array(z.unknown())
    .catch([])
    .transform(items =>
        items.flatMap(item => {
            const parsed = maildevEmailSchema.safeParse(item);

            return parsed.success ? [parsed.data] : [];
        })
    );

const MAILDEV_BASE_URL =
    process.env.MAILDEV_HTTP_URL ??
    `http://127.0.0.1:${process.env.E2E_MAILDEV_WEB_PORT ?? '1081'}`;

function extractEmailUrl(body: string, kind: EmailKind): string | null {
    const links = body.match(/https?:\/\/[^\s<>"']+/gi) ?? [];

    for (const candidate of links) {
        const url = new URL(candidate.replace(/&amp;/g, '&'));
        let hasExpectedPath: boolean;

        if (kind === 'invitation') {
            hasExpectedPath = url.pathname.startsWith('/invitations/');
        } else {
            hasExpectedPath = url.pathname.startsWith(`/api/auth/${kind}`);
        }

        if (!hasExpectedPath) {
            continue;
        }

        if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
            throw new Error('MailDev email links must target loopback');
        }

        return url.toString();
    }

    return null;
}

async function findLatestEmailUrl(
    request: APIRequestContext,
    email: string,
    kind: EmailKind,
    since = 0
): Promise<string> {
    const response = await request.get(new URL('/api/email', MAILDEV_BASE_URL).toString());

    if (!response.ok()) {
        return '';
    }

    const emails = maildevEmailListSchema.safeParse(await response.json());

    if (!emails.success) {
        return '';
    }

    // Truncate `since` like `time`, so an email sent in the same second still counts.
    const sinceSecond = Math.floor(since / 1000) * 1000;

    for (const message of emails.data.toReversed()) {
        if (Date.parse(message.time) < sinceSecond) {
            continue;
        }

        if (!message.to.some(({ address }) => address.toLowerCase() === email.toLowerCase())) {
            continue;
        }

        const url = extractEmailUrl(message.text, kind) ?? extractEmailUrl(message.html, kind);

        if (url) {
            return url;
        }
    }

    return '';
}

export async function waitForPasswordResetUrl(
    page: Page,
    email: string,
    since: number
): Promise<string> {
    let url = '';
    await expect
        .poll(
            async () => {
                url = await findLatestEmailUrl(page.request, email, 'reset-password', since);

                return Boolean(url);
            },
            { timeout: 20000, intervals: [250, 500, 1000] }
        )
        .toBe(true);

    return url;
}

export async function waitForInvitationUrl(
    page: Page,
    email: string,
    since: number
): Promise<string> {
    let url = '';
    await expect
        .poll(
            async () => {
                url = await findLatestEmailUrl(page.request, email, 'invitation', since);

                return Boolean(url);
            },
            { timeout: 20000, intervals: [250, 500, 1000] }
        )
        .toBe(true);

    return url;
}

export async function waitForVerificationUrl(
    page: Page,
    email: string,
    since: number
): Promise<string> {
    let url = '';
    await expect
        .poll(
            async () => {
                url = await findLatestEmailUrl(page.request, email, 'verify-email', since);

                return Boolean(url);
            },
            { timeout: 20000, intervals: [250, 500, 1000] }
        )
        .toBe(true);

    return url;
}

export async function verifyEmailFromInvitationPage(page: Page, email: string): Promise<void> {
    const verificationRequired = page.getByTestId('invitation-verification-required');
    const acceptButton = page.getByTestId('invitation-accept-button').first();
    await expect(verificationRequired.or(acceptButton)).toBeVisible({ timeout: 15000 });

    if (!(await verificationRequired.isVisible())) {
        return;
    }

    await page.getByTestId('invitation-send-verification-email').click();
    await expect(verificationRequired).toContainText(
        /verification email sent|correo de verificación enviado/i,
        {
            timeout: 15000,
        }
    );
    let verificationUrl = '';
    await expect
        .poll(
            async () => {
                verificationUrl = await findLatestEmailUrl(page.request, email, 'verify-email');

                return verificationUrl;
            },
            { timeout: 20000, intervals: [250, 500, 1000] }
        )
        .not.toBe('');
    await page.goto(verificationUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/invitations(?:\?|$)/, { timeout: 20000 });
    await expect(verificationRequired).toBeHidden({ timeout: 20000 });
    await expect(acceptButton).toBeEnabled({ timeout: 20000 });
}
