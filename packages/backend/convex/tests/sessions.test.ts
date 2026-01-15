import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from '../../test.setup';
import { createTestSession, createTestUser, getBetterAuthDoc } from '../../test_helpers';
import { register, runInBetterAuth } from '../../better-auth.helper';

describe('convex sessions', () => {
    const t = convexTest(schema, modules);
    register(t);
    let userId: string;
    let sessionId: string;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        const result = await createTestUser(t, {
            userId: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userId = result.userId;

        sessionId = await createTestSession(t, {
            userId: userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });
    });

    test('createTestSession creates sessions for user', async () => {
        // Create another session
        await createTestSession(t, {
            userId: userId,
            expiresAt: Date.now() + 1000000,
            token: 'test-token-2',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });

        // Verify sessions directly from the component
        const sessions = await runInBetterAuth(t, async ctx => {
            return await ctx.db
                .query('session')
                .withIndex('userId', (q: any) => q.eq('userId', userId))
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

    test('invalidateSession updates session updatedAt', async () => {
        const initialSession = await getBetterAuthDoc<any>(t, sessionId);

        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await userIdentity.mutation(api.sessions.invalidateSession, {
            _id: sessionId,
        });

        expect(result?.message).toBe('Session invalidated');

        const updatedSession = await getBetterAuthDoc<any>(t, sessionId);

        const initialUpdatedAt = initialSession?.updatedAt;
        const finalUpdatedAt = updatedSession?.updatedAt;
        if (initialUpdatedAt !== undefined && finalUpdatedAt !== undefined) {
            expect(finalUpdatedAt).toBeGreaterThan(initialUpdatedAt);
        }
    });
});
