import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from '../../better-auth.helper';
import { createTestSession, createTestUser } from '../../test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../betterAuth/_generated/dataModel';
import { GenericQueryCtx } from 'convex/server';

describe('convex sessions', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let sessionId: string;

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

        await createTestUser(t, user);
        userId = user.userId;

        userIdentity = t.withIdentity({
            subject: user.userId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: user.userId,
            image: "https://example.com/image.png",
            banExpires: null,
            banReason: null,
            banned: false,
        });

        sessionId = await createTestSession(t, {
            userId: userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token-' + randomSuffix,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });
    });

    test('createTestSession creates sessions for user', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        // Create another session
        await createTestSession(t, {
            userId: userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token-2-' + randomSuffix,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });

        // Verify sessions directly from the component using filter (index not available in test env)
        const sessions = await t.run(async (ctx: GenericQueryCtx<DataModel>) => {
            return await ctx.db
                .query('session')
                .filter((q: any) => q.eq(q.field('userId'), userId))
                .collect();
        });

        expect(sessions.length).toBeGreaterThanOrEqual(2);
        expect(sessions.every((s: any) => s.userId === userId)).toBe(true);
    });

    test('getSessionsByUser rejects when unauthenticated', async () => {
        await expect(t.query(api.sessions.getSessionsByUser, { paginationOpts: { numItems: 10, cursor: null } })).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });

    test('session can be retrieved after creation', async () => {
        // Verify that the session created in beforeEach can be retrieved
        const session = await t.run(async (ctx: GenericQueryCtx<DataModel>) => {
            return await ctx.db.get(sessionId as unknown as Id<'session'>);
        });

        expect(session).not.toBeNull();
        expect((session as any)?.userId).toBe(userId);
        expect((session as any)?.createdAt).toBeDefined();
        expect((session as any)?.updatedAt).toBeDefined();
    });
});
