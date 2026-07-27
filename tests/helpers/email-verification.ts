import { expect, type APIRequestContext, type Page } from '@playwright/test';

type MailHogMessage = {
    Created?: string;
    Content?: {
        Body?: string;
        Headers?: Record<string, string[]>;
    };
};

type MailHogSearchResponse = {
    items?: MailHogMessage[];
};

const MAILHOG_BASE_URL =
    process.env.MAILHOG_HTTP_URL ?? `http://127.0.0.1:${process.env.E2E_MAILHOG_UI_PORT ?? '8026'}`;

function extractVerificationUrl(message: MailHogMessage): string | null {
    const body = (message.Content?.Body ?? '')
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9a-f]{2})/gi, (_match, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
        );
    const match = body.match(/https?:\/\/[^\s<>"']+\/api\/auth\/verify-email\?[^\s<>"']+/i);
    return match?.[0]?.replace(/&amp;/g, '&') ?? null;
}

async function findLatestVerificationUrl(
    request: APIRequestContext,
    email: string
): Promise<string> {
    const searchUrl = new URL('/api/v2/search', MAILHOG_BASE_URL);
    searchUrl.searchParams.set('kind', 'to');
    searchUrl.searchParams.set('query', email);
    searchUrl.searchParams.set('limit', '20');

    const response = await request.get(searchUrl.toString());
    if (!response.ok()) {
        return '';
    }

    const payload = (await response.json()) as MailHogSearchResponse;
    const messages = [...(payload.items ?? [])].sort((left, right) =>
        String(right.Created ?? '').localeCompare(String(left.Created ?? ''))
    );

    for (const message of messages) {
        const recipients = message.Content?.Headers?.To ?? [];
        if (!recipients.some(recipient => recipient.toLowerCase().includes(email.toLowerCase()))) {
            continue;
        }

        const verificationUrl = extractVerificationUrl(message);
        if (verificationUrl) {
            return verificationUrl;
        }
    }

    return '';
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
                verificationUrl = await findLatestVerificationUrl(page.request, email);
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
