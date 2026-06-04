import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestSession, createTestUser, ensureTestUserAuth } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
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
            return await ctx.db.get(otherSessionId);
        });

        expect(otherSession).not.toBeNull();
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

        expect(result).toEqual({ success: true, revokedCount: 1 });

        const sessions = await t.run(async ctx => {
            return {
                current: await ctx.db.get(sessionId),
                ownOther: await ctx.db.get(ownOtherSessionId),
                otherUser: await ctx.db.get(otherUserSessionId),
            };
        });

        expect(sessions.current).not.toBeNull();
        expect(sessions.ownOther).toBeNull();
        expect(sessions.otherUser).not.toBeNull();
    });

    test('session can be retrieved after creation', async () => {
        const session = await t.run(async (ctx: GenericQueryCtx<DataModel>) => {
            return await ctx.db.get(sessionId as unknown as Id<'session'>);
        });

        expect(session).not.toBeNull();
        expect((session as { userId?: string })?.userId).toBe(userId);
        expect((session as { createdAt?: number })?.createdAt).toBeDefined();
        expect((session as { updatedAt?: number })?.updatedAt).toBeDefined();
    });
});
