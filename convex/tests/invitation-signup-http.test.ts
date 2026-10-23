import { describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser, TIME } from './test.helpers';

const ORIGIN = 'http://localhost:3000';

describe('signing up from an invitation link', () => {
    const t = initConvexTest();

    test('joins the organization of the invitation @REQ-EQUIPOS-006 @INH-AUT-04', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const email = `invited-${suffix}@example.com`;

        const inviter = await createTestUser(t, {
            userId: `inviter-${suffix}`,
            email: `inviter-${suffix}@example.com`,
            name: 'Inviter',
        });

        const organizationId = await createTestOrganization(t, {
            name: `Invited org ${suffix}`,
            slug: `invited-org-${suffix}`,
        });

        await createTestMember(t, { organizationId, userId: inviter.docId, role: 'owner' });

        const invitationId = await t.run(async ctx => {
            await ctx.db.insert('platformSettings', {
                platformName: 'Platform',
                defaultLanguage: 'en',
                registrationPolicy: 'open',
                setupCompletedBy: inviter.docId,
            });

            return await ctx.db.insert('invitation', {
                organizationId,
                email,
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + TIME.DAY_MS,
                createdAt: Date.now(),
                inviterId: inviter.docId,
                requireEmailVerification: false,
            });
        });

        const response = await t.fetch('/api/auth/sign-up/email', {
            method: 'POST',
            headers: new Headers({ 'content-type': 'application/json', origin: ORIGIN }),
            body: JSON.stringify({
                name: 'Invited',
                email,
                password: 'Password123',
                callbackURL: `/invitations/${invitationId}`,
            }),
        });

        expect(response.status, await response.clone().text()).toBe(200);

        await t.run(async ctx => {
            const user = await ctx.db
                .query('user')
                .withIndex('email_name', q => q.eq('email', email))
                .first();

            if (!user) {
                throw new Error('The account was not created');
            }

            const memberships = await ctx.db
                .query('member')
                .withIndex('userId', q => q.eq('userId', user._id))
                .take(5);

            expect(memberships.map(member => member.organizationId)).toContain(organizationId);
            expect(memberships).toHaveLength(2);
            expect((await ctx.db.get('invitation', invitationId))?.status).toBe('accepted');

            const session = await ctx.db
                .query('session')
                .withIndex('userId', q => q.eq('userId', user._id))
                .first();

            expect(session?.activeOrganizationId).toBe(organizationId);
        });
    });
});
