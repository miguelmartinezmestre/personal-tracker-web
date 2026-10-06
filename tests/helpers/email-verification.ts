import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { z } from 'zod';
type MailHogMessage = {
    Created?: string;
    Content?: { Body?: string; Headers?: Record<string, string[]> };
};
const mailHogHeaderValuesSchema = z.preprocess(value => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
    } else {
        return [];
    }
}, z.array(z.string()));
const mailHogHeadersSchema = z.record(z.string(), mailHogHeaderValuesSchema).catch({});
const mailHogMessageSchema = z
    .object({
        Created: z.string().optional().catch(undefined),
        Content: z
            .object({
                Body: z.string().optional().catch(undefined),
                Headers: mailHogHeadersSchema,
            })
            .optional()
            .catch(undefined),
    })
    .transform(({ Created, Content }) => ({
        ...(Created === undefined ? {} : { Created }),
        ...(Content === undefined ? {} : { Content }),
    }));
const mailHogSearchResponseSchema = z.preprocess(
    value => {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            return { items: [] };
        }
        const items = (value as { items?: unknown }).items;
        let filteredItems: unknown[];
        if (Array.isArray(items)) {
            filteredItems = items.filter(
                item => item !== null && typeof item === 'object' && !Array.isArray(item)
            );
        } else {
            filteredItems = [];
        }
        return { items: filteredItems };
    },
    z.object({ items: z.array(mailHogMessageSchema) })
);
const MAILHOG_BASE_URL =
    process.env.MAILHOG_HTTP_URL ?? `http://127.0.0.1:${process.env.E2E_MAILHOG_UI_PORT ?? '8026'}`;
function parseMailHogMessages(value: unknown): MailHogMessage[] {
    const result = mailHogSearchResponseSchema.safeParse(value);
    return result.success ? result.data.items : [];
}
function extractEmailUrl(
    message: MailHogMessage,
    kind: 'verify-email' | 'reset-password' | 'invitation'
): string | null {
    const body = (message.Content?.Body ?? '')
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9a-f]{2})/gi, (_match, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
        );
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
            throw new Error('MailHog email links must target loopback');
        }
        return url.toString();
    }
    return null;
}
async function findLatestEmailUrl(
    request: APIRequestContext,
    email: string,
    kind: 'verify-email' | 'reset-password' | 'invitation',
    since = 0
): Promise<string> {
    const searchUrl = new URL('/api/v2/search', MAILHOG_BASE_URL);
    searchUrl.searchParams.set('kind', 'to');
    searchUrl.searchParams.set('query', email);
    searchUrl.searchParams.set('limit', '50');
    const response = await request.get(searchUrl.toString());
    if (!response.ok()) {
        return '';
    }
    const payload: unknown = JSON.parse(await response.text());
    const messages = parseMailHogMessages(payload).sort((left, right) =>
        (right.Created ?? '').localeCompare(left.Created ?? '')
    );
    for (const message of messages) {
        if (Date.parse(message.Created ?? '') < since) {
            continue;
        }
        const recipients = message.Content?.Headers?.To ?? [];
        if (
            !recipients.some(
                recipient =>
                    recipient
                        .toLowerCase()
                        .match(/[^\s<>" ,;]+@[^\s<>" ,;]+/g)
                        ?.some(address => address === email.toLowerCase()) ?? false
            )
        ) {
            continue;
        }
        const url = extractEmailUrl(message, kind);
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
export async function verifyEmailFromInvitationPage(page: Page, email: string): Promise<void> {
    const verificationRequired = page.getByTestId('invitation-verification-required');
    const acceptButton = page.getByTestId('invitation-accept-button').first();
    await expect
        .poll(
            async () =>
                (await verificationRequired.isVisible().catch(() => false)) ||
                (await acceptButton.isEnabled().catch(() => false)),
            { timeout: 15000 }
        )
        .toBe(true);
    if (!(await verificationRequired.isVisible().catch(() => false))) {
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
