import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import { createTestSession, createTestUser, ensureTestUserAuth } from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';
import type { GenericQueryCtx } from 'convex/server';

describe('convex sessions', () => {
    const t = initConvexTest();
    let _userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let sessionId: Id<'session'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-sessions-' + randomSuffix,
            email: 'sessions-test@example.com-' + randomSuffix,
            name: 'Sessions Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const { sessionId: defaultSessionId } = await ensureTestUserAuth(t, userId, {
            organizationName: 'Sessions Test Org ' + randomSuffix,
            role: 'owner',
        });
        sessionId = defaultSessionId;

        _userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('createTestSession creates sessions for user', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        await createTestSession(t, {
            userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token-2-' + randomSuffix,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });

        const sessions = await t.run(async (ctx: GenericQueryCtx<DataModel>) => {
            return await ctx.db
                .query('session')
                .filter(q => q.eq(q.field('userId'), userId))
                .collect();
        });

        expect(sessions.length).toBeGreaterThanOrEqual(2);
        expect(sessions.every((session: { userId: string }) => session.userId === userId)).toBe(
            true
        );
    });

    test('getSessionsByUser rejects when unauthenticated', async () => {
        await expect(
            t.query(api.sessions.getSessionsByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });

    test('invalidateSession rejects another user session and leaves it intact', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const otherUser = await createTestUser(t, {
            userId: 'other-session-user-' + randomSuffix,
            email: 'other-session-user@example.com-' + randomSuffix,
            name: 'Other Session User ' + randomSuffix,
            role: 'user',
            emailVerified: false,
        });
        await ensureTestUserAuth(t, otherUser.docId);
        const otherSessionId = await createTestSession(t, {
            userId: otherUser.docId,
            expiresAt: Date.now() + 1000000,
            token: 'other-session-token-' + randomSuffix,
            ipAddress: '127.0.0.2',
            userAgent: 'other-test-agent',
        });

        await expect(
            _userIdentity.mutation(api.sessions.invalidateSession, {
                sessionId: otherSessionId,
            })
        ).rejects.toThrow(/FORBIDDEN|Forbidden|Not authorized/i);

        const otherSession = await t.run(async ctx => {
            return await ctx.db.get('session', otherSessionId);
        });

        expect(otherSession).not.toBeNull();
    });

    test('invalidateSession deletes an owned session', async () => {
        const ownedSessionId = await createTestSession(t, {
            userId,
            expiresAt: Date.now() + 1_000_000,
            token: `owned-session-${Math.random().toString(36).slice(2)}`,
        });

        await expect(
            _userIdentity.mutation(api.sessions.invalidateSession, {
                sessionId: ownedSessionId,
            })
        ).resolves.toBeNull();

        const sessions = await t.run(async ctx => ({
            current: await ctx.db.get('session', sessionId),
            invalidated: await ctx.db.get('session', ownedSessionId),
        }));
        expect(sessions.current).not.toBeNull();
        expect(sessions.invalidated).toBeNull();
    });

    test('invalidateAllOtherSessions only revokes sessions owned by the current user', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const ownOtherSessionId = await createTestSession(t, {
            userId,
            expiresAt: Date.now() + 1000000,
            token: 'own-other-session-token-' + randomSuffix,
            ipAddress: '127.0.0.3',
            userAgent: 'own-other-test-agent',
        });
        const otherUser = await createTestUser(t, {
            userId: 'other-bulk-session-user-' + randomSuffix,
            email: 'other-bulk-session-user@example.com-' + randomSuffix,
            name: 'Other Bulk Session User ' + randomSuffix,
            role: 'user',
            emailVerified: false,
        });
        const otherUserSessionId = await createTestSession(t, {
            userId: otherUser.docId,
            expiresAt: Date.now() + 1000000,
            token: 'other-bulk-session-token-' + randomSuffix,
            ipAddress: '127.0.0.4',
            userAgent: 'other-bulk-test-agent',
        });

        const result = await _userIdentity.mutation(api.sessions.invalidateAllOtherSessions, {
            currentSessionId: sessionId,
        });

        expect(result).toEqual({ revokedCount: 1 });

        const sessions = await t.run(async ctx => {
            return {
                current: await ctx.db.get('session', sessionId),
                ownOther: await ctx.db.get('session', ownOtherSessionId),
                otherUser: await ctx.db.get('session', otherUserSessionId),
            };
        });

        expect(sessions.current).not.toBeNull();
        expect(sessions.ownOther).toBeNull();
        expect(sessions.otherUser).not.toBeNull();
    });

    test('invalidateAllOtherSessions reports only the first batch and finishes asynchronously', async () => {
        const now = Date.now();
        await t.run(async ctx => {
            for (let index = 0; index < 101; index++) {
                await ctx.db.insert('session', {
                    userId,
                    token: `bulk-revoke-${String(userId)}-${index}`,
                    expiresAt: now + 1_000_000,
                    ipAddress: null,
                    userAgent: null,
                    activeOrganizationId: null,
                    createdAt: now + index,
                    updatedAt: now + index,
                });
            }
        });

        const result = await _userIdentity.mutation(api.sessions.invalidateAllOtherSessions, {
            currentSessionId: sessionId,
        });
        expect(result).toEqual({ revokedCount: 100 });

        const afterFirstBatch = await t.run(ctx =>
            ctx.db
                .query('session')
                .withIndex('userId', q => q.eq('userId', userId))
                .collect()
        );
        expect(afterFirstBatch).toHaveLength(2);
        expect(afterFirstBatch.some(session => session._id === sessionId)).toBe(true);

        await drainScheduledFunctions(t);

        const remaining = await t.run(ctx =>
            ctx.db
                .query('session')
                .withIndex('userId', q => q.eq('userId', userId))
                .collect()
        );
        expect(remaining.map(session => session._id)).toEqual([sessionId]);
    });

    test.each([
        ['banned', { banned: true }],
        ['deleted', { deletedAt: Date.now() }],
    ] as const)('rejects a %s account even while its session still exists', async (_, patch) => {
        await t.run(async ctx => {
            await ctx.db.patch('user', userId, patch);
        });

        await expect(
            _userIdentity.query(api.sessions.getSessionsByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/AUTH_REQUIRED/);

        const retainedSession = await t.run(async ctx => ctx.db.get('session', sessionId));
        expect(retainedSession).not.toBeNull();
    });

    test('allows an account again after a temporary ban has expired', async () => {
        await t.run(async ctx => {
            await ctx.db.patch('user', userId, {
                banned: true,
                banReason: 'Temporary ban',
                banExpires: Date.now() - 1,
            });
        });

        const result = await _userIdentity.query(api.sessions.getSessionsByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(result.page.map(session => session._id)).toContain(sessionId);
    });

    test('session can be retrieved after creation', async () => {
        const session = await t.run(async (ctx: GenericQueryCtx<DataModel>) => {
            return await ctx.db.get('session', sessionId);
        });

        if (!session) {
            throw new Error('Expected session');
        }
        expect(session.userId).toBe(userId);
        expect(session.createdAt).toBeDefined();
        expect(session.updatedAt).toBeDefined();
    });
});
