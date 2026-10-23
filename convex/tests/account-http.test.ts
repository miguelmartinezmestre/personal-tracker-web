import { hashPassword } from 'better-auth/crypto';
import { describe, expect, test } from 'vitest';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'ValidDeletionPassword123';

function jsonRequest(body: Record<string, string>, cookie?: string): RequestInit {
    const headers = new Headers({ 'content-type': 'application/json', origin: ORIGIN });

    if (cookie) headers.set('cookie', cookie);

    return { method: 'POST', headers, body: JSON.stringify(body) };
}

function extractCookie(response: Response): string {
    const setCookie = response.headers.get('set-cookie');

    if (!setCookie) throw new Error('Expected Better Auth to set a session cookie');
    const cookie = setCookie.split(';', 1)[0];

    if (!cookie) throw new Error('Expected a non-empty Better Auth session cookie');

    return cookie;
}

describe('account endpoints', () => {
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

    test('verifies the password, returns success, keeps the name and cleans auth rows @REQ-AUTENTICACION-009 @INH-AUT-12 @INH-AUT-15', async () => {
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
            name: 'HTTP deletion user',
            banned: true,
            banReason: 'Account deleted',
            role: null,
            image: null,
        });
        expect(immediateUser?.email).toContain('@deleted.invalid');
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

    test('refuses to delete the user who set up the platform', async () => {
        const { user } = await createCredentialUser('globalAdmin');
        await t.run(ctx =>
            ctx.db.insert('platformSettings', {
                platformName: 'Platform',
                defaultLanguage: 'en',
                registrationPolicy: 'open',
                setupCompletedBy: user.docId,
            })
        );
        const cookie = await signIn(user.email);

        const response = await t.fetch(
            '/api/auth/soft-delete-user',
            jsonRequest({ password: PASSWORD }, cookie)
        );

        expect(response.status).toBe(403);
        const retainedUser = await t.run(ctx => ctx.db.get('user', user.docId));
        expect(retainedUser).not.toBeNull();
        expect(retainedUser?.deletedAt).toBeUndefined();
        await t.run(async ctx => {
            const settings = await ctx.db.query('platformSettings').first();

            if (settings) await ctx.db.delete('platformSettings', settings._id);
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

    test('waits until shared organizations have another owner @REQ-AUTENTICACION-009 @INH-AUT-14', async () => {
        const { user, organizationId } = await createCredentialUser();

        const teammate = await createTestUser(t, {
            userId: `teammate-${Math.random().toString(36).slice(2, 10)}`,
            email: `teammate-${Math.random().toString(36).slice(2, 10)}@example.com`,
            name: 'Teammate',
        });

        const teammateMembership = await createTestMember(t, {
            organizationId,
            userId: teammate.docId,
            role: 'member',
        });

        const cookie = await signIn(user.email);

        const blocked = await t.fetch(
            '/api/auth/soft-delete-user',
            jsonRequest({ password: PASSWORD }, cookie)
        );

        expect(blocked.status).toBe(403);
        expect(await blocked.text()).toContain('OWNER_SUCCESSOR_REQUIRED');
        expect((await t.run(ctx => ctx.db.get('user', user.docId)))?.deletedAt).toBeUndefined();

        await t.run(ctx => ctx.db.patch('member', teammateMembership, { role: 'owner' }));

        const allowed = await t.fetch(
            '/api/auth/soft-delete-user',
            jsonRequest({ password: PASSWORD }, cookie)
        );

        expect(allowed.status).toBe(200);
        await drainScheduledFunctions(t);
        expect(await t.run(ctx => ctx.db.get('organization', organizationId))).not.toBeNull();
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
            expect(retainedUser).not.toBeNull();
            expect(retainedUser?.deletedAt).toBeUndefined();
        });
    });

    test('keeps names free but not blank when signing up or editing the profile @REQ-AUTENTICACION-004 @REQ-AUTENTICACION-001', async () => {
        const { user } = await createCredentialUser();
        const cookie = await signIn(user.email);

        const blank = await t.fetch('/api/auth/update-user', jsonRequest({ name: '   ' }, cookie));

        expect(blank.status).toBe(400);
        expect(await blank.text()).toContain('NAME_REQUIRED');

        const renamed = await t.fetch(
            '/api/auth/update-user',
            jsonRequest({ name: 'HTTP deletion user' }, cookie)
        );

        expect(renamed.status).toBe(200);
    });
});
