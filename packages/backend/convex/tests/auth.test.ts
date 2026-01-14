import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from '../../test.setup';
import { createTestUser } from '../../test_helpers';
import { register } from '../../better-auth.helper';

describe('convex auth', () => {
    const t = convexTest(schema, modules);
    register(t);

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        await createTestUser(t, {
            userId: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
    });

    test('getCurrentUser returns null when unauthenticated', async () => {
        const current = await t.query(api.auth.getCurrentUser, {});
        expect(current).toBeNull();
    });

    test('getCurrentUser returns user when authenticated', async () => {
        const current = await userIdentity.query(api.auth.getCurrentUser, {});
        expect(current).not.toBeNull();
        expect(current?._id).toBeDefined();
    });

    test('isAuthenticated returns true when authenticated', async () => {
        const isAuth = await userIdentity.query(api.auth.isAuthenticated, {});
        expect(isAuth).toBe(true);
    });

    test('isAuthenticated returns false when unauthenticated', async () => {
        const isAuth = await t.query(api.auth.isAuthenticated, {});
        expect(isAuth).toBe(false);
    });
});
