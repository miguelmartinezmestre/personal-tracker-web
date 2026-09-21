import { hashPassword } from 'better-auth/crypto';
import { describe, expect, test } from 'vitest';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';
import type { JsonValue } from '../utils/json';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'ValidDeletionPassword123';

function jsonRequest(body: JsonValue, cookie?: string): RequestInit {
    return {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            origin: ORIGIN,
            ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
    };
}

function extractCookie(response: Response): string {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) throw new Error('Expected Better Auth to set a session cookie');
    const cookie = setCookie.split(';', 1)[0];
    if (!cookie) throw new Error('Expected a non-empty Better Auth session cookie');
    return cookie;
}

describe('soft-delete Better Auth endpoint', () => {
    const t = initConvexTest();

    async function createCredentialUser(role: 'user' | 'globalAdmin' = 'user') {
        const suffix = Math.random().toString(36).slice(2, 10);
        const user = await createTestUser(t, {
            userId: `http-delete-${suffix}`,
            email: `http-delete-${suffix}@example.com`,
            name: 'HTTP deletion user',
            role,
            emailVerified: true,
        });
        const organizationId = await createTestOrganization(t, {
            name: `HTTP deletion org ${suffix}`,
            slug: `http-deletion-org-${suffix}`,
        });
        await createTestMember(t, {
            organizationId,
            userId: user.docId,
            role: 'owner',
        });
        const now = Date.now();
        const passwordHash = await hashPassword(PASSWORD);
        await t.run(async ctx => {
            await ctx.db.insert('account', {
                accountId: String(user.docId),
                providerId: 'credential',
                userId: user.docId,
                password: passwordHash,
                createdAt: now,
                updatedAt: now,
            });
        });

        return { user, organizationId };
    }

    async function signIn(email: string) {
        const response = await t.fetch(
            '/api/auth/sign-in/email',
            jsonRequest({ email, password: PASSWORD })
        );
        expect(response.status, await response.clone().text()).toBe(200);
        return extractCookie(response);
    }

    test('verifies the password, returns success, preserves the tombstone and cleans auth rows', async () => {
        const { user } = await createCredentialUser();
        const cookie = await signIn(user.email);

        const response = await t.fetch(
            '/api/auth/soft-delete-user',
            jsonRequest({ password: PASSWORD }, cookie)
        );

        expect(response.status, await response.clone().text()).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(response.headers.get('set-cookie')).toContain('Max-Age=0');

        const immediateUser = await t.run(ctx => ctx.db.get('user', user.docId));
        expect(immediateUser).toMatchObject({
            name: 'Deleted account',
            banned: true,
            banReason: 'Account deleted',
        });
        expect(immediateUser?.deletedAt).toBeDefined();

        await drainScheduledFunctions(t);

        await t.run(async ctx => {
            const tombstone = await ctx.db.get('user', user.docId);
            expect(tombstone?.deletedAt).toBeDefined();
            expect(
                await ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', user.docId))
                    .collect()
            ).toHaveLength(0);
            expect(
                await ctx.db
                    .query('account')
                    .withIndex('userId', q => q.eq('userId', user.docId))
                    .collect()
            ).toHaveLength(0);
        });
    });

    test('rejects an incorrect password without mutating the account', async () => {
        const { user } = await createCredentialUser();
        const cookie = await signIn(user.email);

        const response = await t.fetch(
            '/api/auth/soft-delete-user',
            jsonRequest({ password: 'WrongDeletionPassword123' }, cookie)
        );

        expect(response.status).toBe(400);
        await t.run(async ctx => {
            const retainedUser = await ctx.db.get('user', user.docId);
            expect(retainedUser?.deletedAt).toBeUndefined();
            expect(
                await ctx.db
                    .query('account')
                    .withIndex('userId', q => q.eq('userId', user.docId))
                    .first()
            ).not.toBeNull();
        });
    });

    test('keeps Better Auth core physical deletion disabled', async () => {
        const { user } = await createCredentialUser();
        const cookie = await signIn(user.email);

        const response = await t.fetch(
            '/api/auth/delete-user',
            jsonRequest({ password: PASSWORD }, cookie)
        );

        expect(response.status).not.toBe(200);
        await t.run(async ctx => {
            const retainedUser = await ctx.db.get('user', user.docId);
            expect(retainedUser?.deletedAt).toBeUndefined();
        });
    });
});
