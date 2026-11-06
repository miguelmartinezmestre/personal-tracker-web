import { describe, expect, test } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test.helpers';
import { runInAuth } from './authTesting';

describe('backend registration policy', () => {
    test('requires the exact active invitation for the same email @REQ-AUTENTICACION-001 @INH-AUT-03', async () => {
        const t = initConvexTest();
        const now = Date.now();

        const inviter = await createTestUser(t, {
            userId: 'registration-policy-inviter',
            email: 'inviter@example.com',
            name: 'Inviter',
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Invitation organization',
            slug: 'invitation-organization',
        });

        await t.run(async ctx => {
            await ctx.db.insert('platformSettings', {
                platformName: 'Private platform',
                defaultLanguage: 'en',
                registrationPolicy: 'invitation-only',
                setupCompletedBy: inviter.docId,
            });
        });

        const invitationIds = await runInAuth(t, async ctx => {
            const active = await ctx.db.insert('invitation', {
                organizationId,
                email: 'invited@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: now + 60_000,
                createdAt: now,
                inviterId: inviter.docId,
            });

            const otherEmail = await ctx.db.insert('invitation', {
                organizationId,
                email: 'other@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: now + 60_000,
                createdAt: now,
                inviterId: inviter.docId,
            });

            const expired = await ctx.db.insert('invitation', {
                organizationId,
                email: 'expired@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: now - 1,
                createdAt: now,
                inviterId: inviter.docId,
            });

            const cancelled = await ctx.db.insert('invitation', {
                organizationId,
                email: 'cancelled@example.com',
                role: 'member',
                status: 'cancelled',
                expiresAt: now + 60_000,
                createdAt: now,
                inviterId: inviter.docId,
            });

            return { active, otherEmail, expired, cancelled };
        });

        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'INVITED@EXAMPLE.COM',
                invitationId: invitationIds.active,
                now,
            })
        ).resolves.toBe('allowed');
        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'invited@example.com',
                invitationId: null,
                now,
            })
        ).resolves.toBe('denied');
        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'invited@example.com',
                invitationId: invitationIds.otherEmail,
                now,
            })
        ).resolves.toBe('denied');
        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'expired@example.com',
                invitationId: invitationIds.expired,
                now,
            })
        ).resolves.toBe('denied');
        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'cancelled@example.com',
                invitationId: invitationIds.cancelled,
                now,
            })
        ).resolves.toBe('denied');
        await expect(
            t.query(internal.auth.getEmailRegistrationAuthorization, {
                email: 'invited@example.com',
                invitationId: 'not-a-convex-id',
                now,
            })
        ).resolves.toBe('denied');
    });
});
