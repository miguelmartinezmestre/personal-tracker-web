import { hashPassword } from 'better-auth/crypto';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';
import { identityFor } from './test.identities';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'ValidOrganizationPassword123';

function jsonRequest(body: Record<string, string | string[]>, cookie?: string): RequestInit {
    const headers = new Headers({ 'content-type': 'application/json', origin: ORIGIN });

    if (cookie) headers.set('cookie', cookie);

    return { method: 'POST', headers, body: JSON.stringify(body) };
}

describe('organization rules enforced through the Better Auth endpoints', () => {
    const t = initConvexTest();

    async function createUser(label: string) {
        const suffix = Math.random().toString(36).slice(2, 10);

        return await createTestUser(t, {
            userId: `${label}-${suffix}`,
            email: `${label}-${suffix}@example.com`,
            name: label,
            emailVerified: true,
        });
    }

    async function signIn(user: { docId: Id<'user'>; email: string }) {
        const passwordHash = await hashPassword(PASSWORD);
        await t.run(async ctx => {
            const now = Date.now();
            await ctx.db.insert('account', {
                accountId: String(user.docId),
                providerId: 'credential',
                userId: user.docId,
                password: passwordHash,
                createdAt: now,
                updatedAt: now,
            });
        });

        const response = await t.fetch(
            '/api/auth/sign-in/email',
            jsonRequest({ email: user.email, password: PASSWORD })
        );

        expect(response.status, await response.clone().text()).toBe(200);
        const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];

        if (!cookie) throw new Error('Expected Better Auth to set a session cookie');

        return cookie;
    }

    async function createSharedOrganization(owner: Id<'user'>, member: Id<'user'>) {
        const suffix = Math.random().toString(36).slice(2, 10);

        const organizationId = await createTestOrganization(t, {
            name: `Shared ${suffix}`,
            slug: `shared-${suffix}`,
        });

        await createTestMember(t, { organizationId, userId: owner, role: 'owner' });

        const memberId = await createTestMember(t, {
            organizationId,
            userId: member,
            role: 'member',
        });

        return { organizationId, memberId };
    }

    test('rejects a role list on member updates', async () => {
        const owner = await createUser('role-owner');
        const member = await createUser('role-member');

        const { organizationId, memberId } = await createSharedOrganization(
            owner.docId,
            member.docId
        );

        const cookie = await signIn(owner);

        const audit = await t.run(ctx =>
            ctx.db
                .query('auditLogs')
                .filter(q => q.eq(q.field('userId'), owner.docId))
                .collect()
        );

        const sessionCreated = audit.find(entry => entry.action === 'session.created');
        expect(Object.keys(sessionCreated?.metadata?.after ?? {}).sort()).toEqual(
            ['_id', 'activeOrganizationId', 'createdAt', 'expiresAt', 'updatedAt', 'userId'].sort()
        );

        const update = await t.fetch(
            '/api/auth/organization/update-member-role',
            jsonRequest({ memberId, organizationId, role: ['admin', 'member'] }, cookie)
        );

        expect(update.status).toBe(400);
        expect(await t.run(ctx => ctx.db.get('member', memberId))).toMatchObject({
            role: 'member',
        });

        const singleRole = await t.fetch(
            '/api/auth/organization/update-member-role',
            jsonRequest({ memberId, organizationId, role: 'admin' }, cookie)
        );

        expect(singleRole.status, await singleRole.clone().text()).toBe(200);
    });

    test('a refused personal organization delete keeps the user signed in', async () => {
        const user = await createUser('personal-owner');

        const organizationId = await createTestOrganization(t, {
            name: 'Personal Organization',
            slug: `personal-organization-${String(user.docId).slice(-8)}`,
            description: JSON.stringify({ type: 'personal', ownerUserId: user.docId }),
        });

        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
        const cookie = await signIn(user);

        const response = await t.fetch(
            '/api/auth/organization/delete',
            jsonRequest({ organizationId }, cookie)
        );

        expect(response.status).toBe(403);
        expect(await t.run(ctx => ctx.db.get('organization', organizationId))).not.toBeNull();

        const current = await t.fetch('/api/auth/get-session', {
            headers: { cookie, origin: ORIGIN },
        });

        const { session } = z
            .object({
                session: z.object({ id: z.string(), activeOrganizationId: z.string().nullable() }),
            })
            .parse(await current.json());

        expect(session.activeOrganizationId).toBeNull();

        const sessionId = await t.run(async ctx => ctx.db.normalizeId('session', session.id));

        if (!sessionId) throw new Error('Expected a session id');

        const context = await t
            .withIdentity(identityFor(user, sessionId))
            .query(api.auth.getDashboardContext, {});

        expect(context.organizationId).toBeNull();
    });
});
