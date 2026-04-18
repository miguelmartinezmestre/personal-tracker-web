/// <reference types="vite/client" />
import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestSession, createTestUser } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { Id } from '../_generated/dataModel';

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
            role: 'admin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

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

        sessionId = await createTestSession(t, {
            userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token-' + randomSuffix,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
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
        expect(sessions.every((s: { userId: string }) => s.userId === userId)).toBe(true);
    });

    test('getSessionsByUser rejects when unauthenticated', async () => {
        await expect(
            t.query(api.sessions.getSessionsByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
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
