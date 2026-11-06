import { hashPassword } from 'better-auth/crypto';
import { describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';
import { runInAuth } from './authTesting';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'ValidBoundaryPassword123';

function request(method: 'GET' | 'POST', body?: Record<string, unknown>, cookie?: string) {
    const headers = new Headers({ 'content-type': 'application/json', origin: ORIGIN });

    if (cookie) headers.set('cookie', cookie);

    return { method, headers, body: body ? JSON.stringify(body) : undefined } satisfies RequestInit;
}

function extractCookie(response: Response): string {
    const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];

    if (!cookie) throw new Error('Expected Better Auth to set a session cookie');

    return cookie;
}

describe('auth boundaries', () => {
    const t = initConvexTest();

    async function createOwner() {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `boundary-${suffix}`,
            email: `boundary-${suffix}@example.com`,
            name: 'Boundary owner',
            role: 'user',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: `Boundary org ${suffix}`,
            slug: `boundary-org-${suffix}`,
        });

        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
        const passwordHash = await hashPassword(PASSWORD);
        await runInAuth(t, async ctx => {
            await ctx.db.insert('account', {
                accountId: String(user.docId),
                providerId: 'credential',
                userId: user.docId,
                password: passwordHash,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        return { user, organizationId, suffix };
    }

    async function signIn(email: string, password = PASSWORD) {
        return await t.fetch('/api/auth/sign-in/email', request('POST', { email, password }));
    }

    test('a weak new password is rejected even when the request also carries a strong one @REQ-NF-003 @REQ-AUTENTICACION-004', async () => {
        const { user } = await createOwner();
        const cookie = extractCookie(await signIn(user.email));

        const response = await t.fetch(
            '/api/auth/change-password',
            request(
                'POST',
                {
                    currentPassword: PASSWORD,
                    newPassword: 'onlylowercase',
                    password: 'StrongPassword123',
                },
                cookie
            )
        );

        expect(response.status).toBe(400);
        expect(await response.text()).toContain('WEAK_PASSWORD');
        expect((await signIn(user.email)).status).toBe(200);
        expect((await signIn(user.email, 'onlylowercase')).status).not.toBe(200);
    });

    test('native routes that list invitations or return a whole organization are disabled @REQ-NF-003', async () => {
        const { user, organizationId } = await createOwner();
        const cookie = extractCookie(await signIn(user.email));

        for (const path of [
            `/api/auth/organization/list-invitations?organizationId=${organizationId}`,
            '/api/auth/organization/list-user-invitations',
            `/api/auth/organization/get-full-organization?organizationId=${organizationId}`,
        ]) {
            const response = await t.fetch(path, request('GET', undefined, cookie));

            expect(response.status, path).toBe(404);
        }
    });

    test('an inviter cannot let an invitation skip email verification @REQ-EQUIPOS-002 @REQ-EQUIPOS-006', async () => {
        const { user, organizationId, suffix } = await createOwner();
        const cookie = extractCookie(await signIn(user.email));
        const email = `invitee-${suffix}@example.com`;

        const response = await t.fetch(
            '/api/auth/organization/invite-member',
            request(
                'POST',
                { email, role: 'member', organizationId, requireEmailVerification: false },
                cookie
            )
        );

        expect(response.status, await response.clone().text()).toBe(200);

        const invitation = await runInAuth(t, ctx =>
            ctx.db
                .query('invitation')
                .withIndex('by_email_status_expiresAt', q =>
                    q.eq('email', email).eq('status', 'pending')
                )
                .first()
        );

        expect(invitation?.requireEmailVerification).toBe(true);
    });
});
