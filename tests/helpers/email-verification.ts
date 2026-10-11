import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { z } from 'zod';

type EmailKind = 'verify-email' | 'reset-password' | 'invitation';

// Mailpit lists summaries newest first; bodies come from the per-message endpoint already
// decoded, so links need no quoted-printable handling.
const mailpitSummarySchema = z.object({
    ID: z.string(),
    Created: z.string().optional().catch(undefined),
    To: z.array(z.object({ Address: z.string().catch('') })).catch([]),
});
const mailpitSearchResponseSchema = z.object({
    messages: z
        .array(z.unknown())
        .catch([])
        .transform(items =>
            items.flatMap(item => {
                const parsed = mailpitSummarySchema.safeParse(item);
                return parsed.success ? [parsed.data] : [];
            })
        ),
});
const mailpitMessageSchema = z.object({
    Text: z.string().catch(''),
    HTML: z.string().catch(''),
});
const MAILPIT_BASE_URL =
    process.env.MAILPIT_HTTP_URL ?? `http://127.0.0.1:${process.env.E2E_MAILPIT_UI_PORT ?? '8026'}`;
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
            throw new Error('Mailpit email links must target loopback');
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
    const searchUrl = new URL('/api/v1/search', MAILPIT_BASE_URL);
    searchUrl.searchParams.set('query', `to:"${email}"`);
    searchUrl.searchParams.set('limit', '50');
    const response = await request.get(searchUrl.toString());
    if (!response.ok()) {
        return '';
    }
    const search = mailpitSearchResponseSchema.safeParse(await response.json());
    if (!search.success) {
        return '';
    }
    for (const summary of search.data.messages) {
        if (Date.parse(summary.Created ?? '') < since) {
            continue;
        }
        // `to:` matches substrings, so a@x.com would also find aa@x.com.
        if (!summary.To.some(({ Address }) => Address.toLowerCase() === email.toLowerCase())) {
            continue;
        }
        const messageUrl = new URL(`/api/v1/message/${summary.ID}`, MAILPIT_BASE_URL);
        const messageResponse = await request.get(messageUrl.toString());
        if (!messageResponse.ok()) {
            continue;
        }
        const message = mailpitMessageSchema.safeParse(await messageResponse.json());
        if (!message.success) {
            continue;
        }
        const url =
            extractEmailUrl(message.data.Text, kind) ?? extractEmailUrl(message.data.HTML, kind);
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
