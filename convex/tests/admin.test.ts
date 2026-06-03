import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestSession,
    createTestUser,
} from './test_helpers';
import type { Id } from '../_generated/dataModel';

describe('convex admin', () => {
    const t = initConvexTest();
    let adminIdentity: ReturnType<typeof t.withIdentity>;
    let userIdentity: ReturnType<typeof t.withIdentity>;
    let orgAdminIdentity: ReturnType<typeof t.withIdentity>;
    let adminId: Id<'user'>;
    let userId: Id<'user'>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);
        const admin = await createTestUser(t, {
            userId: `admin-${random}`,
            email: `admin-${random}@example.com`,
            name: `Admin ${random}`,
            role: 'globalAdmin',
        });
        const user = await createTestUser(t, {
            userId: `user-${random}`,
            email: `user-${random}@example.com`,
            name: `User ${random}`,
            role: 'user',
        });
        const orgAdmin = await createTestUser(t, {
            userId: `org-admin-${random}`,
            email: `org-admin-${random}@example.com`,
            name: `Org Admin ${random}`,
            role: 'user',
        });
        adminId = admin.docId;
        userId = user.docId;

        const organizationId = await createTestOrganization(t, {
            name: `Admin Test Org ${random}`,
            slug: `admin-test-org-${random}`,
        });
        await createTestMember(t, { organizationId, userId: adminId, role: 'owner' });
        await createTestMember(t, { organizationId, userId, role: 'member' });
        await createTestMember(t, {
            organizationId,
            userId: orgAdmin.docId,
            role: 'admin',
        });

        adminIdentity = t.withIdentity({
            subject: adminId,
            userId: adminId,
            email: admin.email,
            name: admin.name,
            role: 'globalAdmin',
            emailVerified: true,
            createdAt: Date.now(),
            image: null,
            banExpires: null,
            banReason: null,
            banned: false,
        });

        userIdentity = t.withIdentity({
            subject: userId,
            userId,
            email: user.email,
            name: user.name,
            role: 'user',
            emailVerified: true,
            createdAt: Date.now(),
            image: null,
            banExpires: null,
            banReason: null,
            banned: false,
        });

        orgAdminIdentity = t.withIdentity({
            subject: orgAdmin.docId,
            userId: orgAdmin.docId,
            email: orgAdmin.email,
            name: orgAdmin.name,
            role: 'user',
            emailVerified: true,
            createdAt: Date.now(),
            image: null,
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('allows admins to list users', async () => {
        const result = await adminIdentity.query(api.admin.listUsers, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(result.page.map(user => user._id)).toEqual(
            expect.arrayContaining([adminId, userId])
        );
    });

    test('rejects non-admin users from listing users', async () => {
        await expect(
            userIdentity.query(api.admin.listUsers, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/FORBIDDEN|Unauthorized|Unauthenticated|AUTH_REQUIRED/);
    });

    test('rejects organization admins from global admin APIs', async () => {
        await expect(
            orgAdminIdentity.query(api.admin.listUsers, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/FORBIDDEN|Unauthorized|Unauthenticated|AUTH_REQUIRED/);
    });

    test('allows admins to update user roles', async () => {
        const result = await adminIdentity.mutation(api.admin.updateUserRole, {
            userId,
            role: 'globalAdmin',
        });

        const updatedUser = await t.run(async ctx => await ctx.db.get(userId));

        expect(result).toEqual({ success: true });
        expect(updatedUser?.role).toBe('globalAdmin');
    });

    test('lists user sessions as non-current admin session items', async () => {
        const sessionId = await createTestSession(t, {
            userId,
            token: 'session-token',
            expiresAt: Date.now() + 60_000,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        const result = await adminIdentity.query(api.admin.listUserSessions, {
            userId,
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(result.page).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: sessionId,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Vitest',
                    isCurrent: false,
                }),
            ])
        );
        expect(result.page).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    _id: expect.any(String),
                    isCurrent: true,
                }),
            ])
        );
    });

    test('allows admins to revoke only sessions belonging to the target user', async () => {
        const userSessionId = await createTestSession(t, {
            userId,
            token: 'user-session-token',
            expiresAt: Date.now() + 60_000,
        });
        const adminSessionId = await createTestSession(t, {
            userId: adminId,
            token: 'admin-session-token',
            expiresAt: Date.now() + 60_000,
        });

        await expect(
            adminIdentity.mutation(api.admin.revokeUserSession, {
                userId,
                sessionId: adminSessionId,
            })
        ).rejects.toThrow(/FORBIDDEN/);

        const result = await adminIdentity.mutation(api.admin.revokeUserSession, {
            userId,
            sessionId: userSessionId,
        });

        const revokedSession = await t.run(async ctx => await ctx.db.get(userSessionId));
        const adminSession = await t.run(async ctx => await ctx.db.get(adminSessionId));

        expect(result).toEqual({ success: true });
        expect(revokedSession).toBeNull();
        expect(adminSession).not.toBeNull();
    });

    test('rejects deleting the platform setup user', async () => {
        await t.run(async ctx => {
            await ctx.db.insert('platformSettings', {
                platformName: 'Test Platform',
                defaultLanguage: 'en',
                registrationPolicy: 'open',
                setupCompletedAt: Date.now(),
                setupCompletedBy: adminId,
            });
        });

        await expect(
            adminIdentity.mutation(api.admin.deleteUser, {
                userId: adminId,
            })
        ).rejects.toThrow(/SETUP_USER_DELETE_FORBIDDEN/);
    });
});
