import { expect, type APIRequestContext, type Page } from '@playwright/test';
import {
    getOptionalString,
    isJsonObject,
    parseJsonValue,
    type JsonValue,
} from '@shared/boundary-values';
type MailHogMessage = {
    Created?: string;
    Content?: {
        Body?: string;
        Headers?: Record<string, string[]>;
    };
};
const MAILHOG_BASE_URL =
    process.env.MAILHOG_HTTP_URL ?? `http://127.0.0.1:${process.env.E2E_MAILHOG_UI_PORT ?? '8026'}`;
function readStringArray(value: JsonValue | undefined): string[] {
    if (
        value === undefined ||
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        isJsonObject(value)
    ) {
        return [];
    }
    return value.filter((value: unknown) => typeof value === 'string');
}
function readHeaders(value: JsonValue | undefined): Record<string, string[]> {
    if (!isJsonObject(value)) {
        return {};
    }
    const headers: Record<string, string[]> = {};
    for (const [key, headerValue] of Object.entries(value)) {
        headers[key] = readStringArray(headerValue);
    }
    return headers;
}
function parseMailHogMessage(value: JsonValue): MailHogMessage | undefined {
    if (!isJsonObject(value)) {
        return undefined;
    }
    const contentValue = value.Content;
    const content = isJsonObject(contentValue)
        ? {
              Body: getOptionalString(contentValue.Body),
              Headers: readHeaders(contentValue.Headers),
          }
        : undefined;
    return {
        Created: getOptionalString(value.Created),
        Content: content,
    };
}
function parseMailHogMessages(value: JsonValue): MailHogMessage[] {
    if (!isJsonObject(value)) {
        return [];
    }
    const items = value.items;
    if (
        items === undefined ||
        items === null ||
        typeof items === 'string' ||
        typeof items === 'number' ||
        typeof items === 'boolean' ||
        isJsonObject(items)
    ) {
        return [];
    }
    const messages: MailHogMessage[] = [];
    for (const item of items) {
        const message = parseMailHogMessage(item);
        if (message) {
            messages.push(message);
        }
    }
    return messages;
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
        const hasExpectedPath =
            kind === 'invitation'
                ? url.pathname.startsWith('/invitations/')
                : url.pathname.startsWith(`/api/auth/${kind}`);
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
    searchUrl.searchParams.set('limit', '20');
    const response = await request.get(searchUrl.toString());
    if (!response.ok()) {
        return '';
    }
    const payload = parseJsonValue(await response.text());
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
