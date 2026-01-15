import { runInBetterAuth, type ComponentRunner } from './better-auth.helper';

/**
 * Test user data returned by createTestUser
 */
export interface TestUserData {
    userId: string;
    email: string;
    name: string;
    role?: string;
}

/**
 * Helper function to create a test user in the Better Auth component (tests).
 *
 * This seeds the Better Auth "user" table directly via `runInComponent`.
 *
 * For tests that need authentication, the identity's 'subject' field is used
 * as the user ID. This function also seeds the Better Auth "user" table so
 * queries can resolve email/name/role in tests.
 *
 * IMPORTANT: The userId must match the 'subject' in the identity used for testing.
 * For example, if you use `t.withIdentity({ subject: "test-user-123" })`,
 * then the userId should be "test-user-123".
 *
 * @example
 * ```typescript
 * const userIdentity = t.withIdentity({ subject: 'test-user-123', role: 'admin' });
 * register(t);
 *
 * beforeEach(async () => {
 *     const result = await createTestUser(userIdentity, {
 *         userId: 'test-user-123',
 *         email: 'test@example.com',
 *         name: 'Test User',
 *         role: 'admin',
 *     });
 * });
 * ```
 */
export async function createTestUser(
    t: ComponentRunner,
    options: {
        userId: string;
        email: string;
        name: string;
        password?: string;
        role?: string;
        emailVerified?: boolean;
    }
): Promise<TestUserData> {
    const { userId, email, name, role, emailVerified } = options;
    const now = Date.now();

    await runInBetterAuth(t, async ctx => {
        const existing = await ctx.db
            .query('user')
            .withIndex('userId', (q: any) => q.eq('userId', userId))
            .first();

        if (existing) {
            await ctx.db.patch('user', existing._id, {
                name,
                email,
                emailVerified: emailVerified ?? false,
                role: role ?? null,
                updatedAt: now,
            });
            return;
        }

        await ctx.db.insert('user', {
            name,
            email,
            emailVerified: emailVerified ?? false,
            createdAt: now,
            updatedAt: now,
            userId: userId,
            role: role ?? null,
        });
    });

    return {
        userId,
        email,
        name,
        role,
    };
}

/**
 * Helper to create multiple test users at once.
 */
export async function createTestUsers(
    t: ComponentRunner,
    users: Array<{
        userId: string;
        email: string;
        name: string;
        password?: string;
        role?: string;
        emailVerified?: boolean;
    }>
): Promise<TestUserData[]> {
    const results: TestUserData[] = [];
    for (const user of users) {
        const result = await createTestUser(t, user);
        results.push(result);
    }
    return results;
}

export async function createTestOrganization(
    t: ComponentRunner,
    options: {
        name: string;
        slug: string;
        description?: string | null;
    }
): Promise<string> {
    const now = Date.now();
    return runInBetterAuth(t, async ctx => {
        return await ctx.db.insert('organization', {
            name: options.name,
            slug: options.slug,
            description: options.description ?? null,
            createdAt: now,
            metadata: null,
            logo: null,
        });
    });
}

export async function createTestMember(
    t: ComponentRunner,
    options: {
        organizationId: string;
        userId: string;
        role: string;
    }
): Promise<string> {
    const now = Date.now();
    return runInBetterAuth(t, async ctx => {
        return await ctx.db.insert('member', {
            organizationId: options.organizationId,
            userId: options.userId,
            role: options.role,
            createdAt: now,
        });
    });
}

export async function createTestSession(
    t: ComponentRunner,
    options: {
        userId: string;
        token: string;
        expiresAt: number;
        ipAddress?: string | null;
        userAgent?: string | null;
    }
): Promise<string> {
    const now = Date.now();
    return runInBetterAuth(t, async ctx => {
        return await ctx.db.insert('session', {
            userId: options.userId,
            expiresAt: options.expiresAt,
            token: options.token,
            ipAddress: options.ipAddress ?? null,
            userAgent: options.userAgent ?? null,
            createdAt: now,
            updatedAt: now,
        });
    });
}

export async function getBetterAuthDoc<T>(t: ComponentRunner, id: string): Promise<T | null> {
    return runInBetterAuth(t, async ctx => {
        return (await ctx.db.get(id)) as T | null;
    });
}
