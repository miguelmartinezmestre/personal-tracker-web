import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestSession,
    createTestUser,
} from './test_helpers';
import type { Id } from '../_generated/dataModel';
import { isJsonObject } from '../../shared/boundary-values';

describe('convex admin', () => {
    const t = initConvexTest();
    let adminIdentity: ReturnType<typeof t.withIdentity>;
    let userIdentity: ReturnType<typeof t.withIdentity>;
    let orgAdminIdentity: ReturnType<typeof t.withIdentity>;
    let adminId: Id<'user'>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;
    let adminName: string;
    let userEmail: string;

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
        adminName = admin.name;
        userEmail = user.email;

        organizationId = await createTestOrganization(t, {
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

    test('listUsers without searchValue returns test users', async () => {
        const result = await adminIdentity.query(api.admin.listUsers, {
            paginationOpts: { numItems: 50, cursor: null },
        });

        expect(result.page.map(user => user._id)).toEqual(
            expect.arrayContaining([adminId, userId])
        );
    });

    test('listUsers with name fragment searchValue returns matching user', async () => {
        const nameFragment = adminName.split(' ')[0];

        const result = await adminIdentity.query(api.admin.listUsers, {
            paginationOpts: { numItems: 10, cursor: null },
            searchValue: nameFragment,
        });

        expect(result.page.map(user => user._id)).toContain(adminId);
    });

    test('listUsers with full email searchValue returns that user', async () => {
        const result = await adminIdentity.query(api.admin.listUsers, {
            paginationOpts: { numItems: 10, cursor: null },
            searchValue: userEmail,
        });

        expect(result.page).toEqual([expect.objectContaining({ _id: userId, email: userEmail })]);
    });

    test('listUsers with no-match searchValue returns empty page', async () => {
        const result = await adminIdentity.query(api.admin.listUsers, {
            paginationOpts: { numItems: 10, cursor: null },
            searchValue: 'zzzznonexistent-user-search-12345',
        });

        expect(result.page).toEqual([]);
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

    test('rejects non-admin bans and prevents an admin from banning itself', async () => {
        await expect(userIdentity.mutation(api.admin.banUser, { userId: adminId })).rejects.toThrow(
            /FORBIDDEN/
        );

        await expect(
            adminIdentity.mutation(api.admin.banUser, { userId: adminId })
        ).rejects.toThrow(/FORBIDDEN/);
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
        expect(result.page.some(session => session.isCurrent)).toBe(false);
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

        const revokedSession = await t.run(async ctx => await ctx.db.get('session', userSessionId));
        const adminSession = await t.run(async ctx => await ctx.db.get('session', adminSessionId));

        expect(result).toEqual({ success: true });
        expect(revokedSession).toBeNull();
        expect(adminSession).not.toBeNull();
    });

    test('banUser gates access immediately and finishes a large session cleanup asynchronously', async () => {
        vi.useFakeTimers();
        try {
            const extraSessionCount = 101;
            const now = Date.now();
            let retainedSessionId: Id<'session'> | null = null;

            for (let start = 0; start < extraSessionCount; start += 50) {
                const insertedIds = await t.run(async ctx => {
                    const ids: Id<'session'>[] = [];
                    for (let i = start; i < Math.min(start + 50, extraSessionCount); i++) {
                        ids.push(
                            await ctx.db.insert('session', {
                                userId,
                                token: `ban-session-${String(userId)}-${i}`,
                                expiresAt: now + 60_000,
                                ipAddress: null,
                                userAgent: null,
                                activeOrganizationId: organizationId,
                                createdAt: now + i,
                                updatedAt: now + i,
                            })
                        );
                    }
                    return ids;
                });
                retainedSessionId = insertedIds[insertedIds.length - 1] ?? retainedSessionId;
            }

            if (!retainedSessionId) throw new Error('Expected a retained session');

            const bannedIdentity = t.withIdentity({
                subject: userId,
                userId,
                sessionId: retainedSessionId,
                email: userEmail,
                name: 'Banned test user',
                role: 'user',
                emailVerified: true,
            });

            const result = await adminIdentity.mutation(api.admin.banUser, { userId });
            const stateAfterMutation = await t.run(async ctx => ({
                user: await ctx.db.get('user', userId),
                retainedSession: await ctx.db.get('session', retainedSessionId),
                remainingSessions: await ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', userId))
                    .collect(),
                auditLogs: await ctx.db
                    .query('auditLogs')
                    .withIndex('by_resourceType_resourceId', q =>
                        q.eq('resourceType', 'user').eq('resourceId', String(userId))
                    )
                    .collect(),
            }));

            expect(result).toEqual({ success: true });
            expect(stateAfterMutation.user).toMatchObject({
                banned: true,
                banReason: 'No reason',
                banExpires: null,
            });
            expect(stateAfterMutation.user?.updatedAt).toBeGreaterThanOrEqual(now);
            expect(stateAfterMutation.retainedSession).not.toBeNull();
            expect(stateAfterMutation.remainingSessions.length).toBeGreaterThan(0);
            expect(
                stateAfterMutation.auditLogs.some(log => {
                    const after = log.metadata?.after;
                    return (
                        log.userId === adminId &&
                        log.action === 'user.updated' &&
                        log.resourceType === 'user' &&
                        log.resourceId === String(userId) &&
                        isJsonObject(after) &&
                        after.banned === true
                    );
                })
            ).toBe(true);

            await expect(
                bannedIdentity.query(api.sessions.getSessionsByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/AUTH_REQUIRED/);

            await t.finishAllScheduledFunctions(() => vi.runAllTimers());

            const remainingSessions = await t.run(async ctx =>
                ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', userId))
                    .collect()
            );
            expect(remainingSessions).toHaveLength(0);
        } finally {
            vi.useRealTimers();
        }
    });

    test('stores a bounded temporary ban and clears every ban field when unbanned', async () => {
        vi.useFakeTimers();
        try {
            const now = Date.now();
            const banExpiresInSeconds = 3_600;

            await adminIdentity.mutation(api.admin.banUser, {
                userId,
                banReason: 'Temporary review',
                banExpiresInSeconds,
            });

            const bannedUser = await t.run(async ctx => ctx.db.get('user', userId));
            expect(bannedUser).toMatchObject({
                banned: true,
                banReason: 'Temporary review',
                banExpires: now + banExpiresInSeconds * 1000,
            });
            expect(bannedUser?.updatedAt).toBeGreaterThanOrEqual(now);

            await adminIdentity.mutation(api.admin.unbanUser, { userId });

            const unbannedUser = await t.run(async ctx => ctx.db.get('user', userId));
            expect(unbannedUser).toMatchObject({
                banned: false,
                banReason: null,
                banExpires: null,
            });
            expect(unbannedUser?.updatedAt).toBeGreaterThan(bannedUser?.updatedAt ?? 0);
        } finally {
            vi.useRealTimers();
        }
    });

    test.each([0, Number.MAX_SAFE_INTEGER])(
        'rejects an invalid ban duration (%s)',
        async banExpiresInSeconds => {
            await expect(
                adminIdentity.mutation(api.admin.banUser, {
                    userId,
                    banExpiresInSeconds,
                })
            ).rejects.toThrow(/VALIDATION_ERROR/);

            const user = await t.run(async ctx => ctx.db.get('user', userId));
            expect(user?.banned).toBe(false);
        }
    );

    test('soft-deletes a user through the public admin API and preserves an audited tombstone', async () => {
        vi.useFakeTimers();
        try {
            const now = Date.now();
            await t.run(async ctx => {
                await ctx.db.insert('account', {
                    accountId: String(userId),
                    providerId: 'credential',
                    userId,
                    password: 'test-password-hash',
                    createdAt: now,
                    updatedAt: now,
                });
            });

            await expect(
                adminIdentity.mutation(api.admin.deleteUser, { userId: adminId })
            ).rejects.toThrow(/FORBIDDEN/);

            const result = await adminIdentity.mutation(api.admin.deleteUser, { userId });
            const immediate = await t.run(async ctx => ({
                user: await ctx.db.get('user', userId),
                auditLogs: await ctx.db
                    .query('auditLogs')
                    .withIndex('by_resourceType_resourceId', q =>
                        q.eq('resourceType', 'user').eq('resourceId', String(userId))
                    )
                    .collect(),
            }));

            expect(result).toEqual({ success: true });
            expect(immediate.user).toMatchObject({
                name: 'Deleted account',
                banned: true,
                banReason: 'Account deleted',
            });
            expect(immediate.user?.deletedAt).toBeDefined();
            expect(
                immediate.auditLogs.some(
                    log =>
                        log.action === 'user.deleted' &&
                        log.userId === userId &&
                        log.actorUserId === adminId &&
                        log.metadata?.context === 'soft_delete'
                )
            ).toBe(true);

            await t.finishAllScheduledFunctions(() => vi.runAllTimers());

            const finalState = await t.run(async ctx => ({
                user: await ctx.db.get('user', userId),
                sessions: await ctx.db
                    .query('session')
                    .withIndex('userId', q => q.eq('userId', userId))
                    .collect(),
                accounts: await ctx.db
                    .query('account')
                    .withIndex('userId', q => q.eq('userId', userId))
                    .collect(),
            }));
            expect(finalState.user?.deletedAt).toBeDefined();
            expect(finalState.sessions).toHaveLength(0);
            expect(finalState.accounts).toHaveLength(0);
        } finally {
            vi.useRealTimers();
        }
    });

    test('updates user profile fields and role through the guarded admin mutation', async () => {
        const result = await adminIdentity.mutation(api.admin.updateUser, {
            userId,
            name: '  Updated User  ',
            email: 'UPDATED.USER@EXAMPLE.COM',
            role: 'globalAdmin',
        });

        const updated = await t.run(async ctx => await ctx.db.get('user', userId));
        expect(result).toEqual({ success: true });
        expect(updated).toMatchObject({
            name: 'Updated User',
            email: 'updated.user@example.com',
            role: 'globalAdmin',
        });
    });

    test('allows an admin to edit its own profile but not its own role', async () => {
        await expect(
            adminIdentity.mutation(api.admin.updateUser, {
                userId: adminId,
                name: 'Renamed Administrator',
                email: 'renamed.admin@example.com',
                role: 'globalAdmin',
            })
        ).resolves.toEqual({ success: true });

        await expect(
            adminIdentity.mutation(api.admin.updateUser, {
                userId: adminId,
                name: 'Renamed Administrator',
                email: 'renamed.admin@example.com',
                role: 'user',
            })
        ).rejects.toThrow(/FORBIDDEN/);
    });

    test('rejects duplicate or malformed emails in admin user updates', async () => {
        await expect(
            adminIdentity.mutation(api.admin.updateUser, {
                userId,
                name: 'User',
                email: userEmail.replace(/^user-/, 'admin-'),
                role: 'user',
            })
        ).rejects.toThrow(/VALIDATION_ERROR/);

        await expect(
            adminIdentity.mutation(api.admin.updateUser, {
                userId,
                name: 'User',
                email: 'not-an-email',
                role: 'user',
            })
        ).rejects.toThrow(/VALIDATION_ERROR/);
    });

    test('prevents an administrator from demoting the platform setup user', async () => {
        await adminIdentity.mutation(api.admin.updateUser, {
            userId,
            name: 'Setup Administrator',
            email: userEmail,
            role: 'globalAdmin',
        });
        const settingsId = await t.run(async ctx =>
            ctx.db.insert('platformSettings', {
                platformName: 'Test Platform',
                defaultLanguage: 'en',
                registrationPolicy: 'open',
                setupCompletedAt: Date.now(),
                setupCompletedBy: userId,
            })
        );

        try {
            await expect(
                adminIdentity.mutation(api.admin.updateUser, {
                    userId,
                    name: 'Setup Administrator',
                    email: userEmail,
                    role: 'user',
                })
            ).rejects.toThrow(/FORBIDDEN/);
        } finally {
            await t.run(async ctx => ctx.db.delete('platformSettings', settingsId));
        }
    });

    test('rejects banning or deleting the platform setup user', async () => {
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
            adminIdentity.mutation(api.admin.banUser, { userId: adminId })
        ).rejects.toThrow(/SETUP_USER_BAN_FORBIDDEN/);

        await expect(
            adminIdentity.mutation(api.admin.deleteUser, {
                userId: adminId,
            })
        ).rejects.toThrow(/SETUP_USER_DELETE_FORBIDDEN/);
    });
});
