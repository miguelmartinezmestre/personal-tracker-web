import { MutationCtx } from './_generated/server';

/**
 * Helper function to create a complete test user with all required fields
 * Similar to what better-auth does when creating a user via sign-up
 *
 * Note: This requires a context with write access (MutationCtx or equivalent from convex-test)
 *
 * IMPORTANT: The userId must match the 'subject' in the identity used for testing.
 * For example, if you use `t.withIdentity({ subject: "test-user-123" })`,
 * then the userId should be "test-user-123".
 */
export async function createTestUser(
    ctx: { db: MutationCtx['db'] },
    options: {
        userId: string;
        email: string;
        name: string;
        password?: string;
        role?: string;
        emailVerified?: boolean;
    }
) {
    const now = Date.now();
    const { userId, email, name, password, role, emailVerified = false } = options;

    // Check if user already exists to avoid duplicates
    const existingUser = await ctx.db
        .query('user')
        .withIndex('userId', q => q.eq('userId', userId))
        .first();

    let userRecordId;
    if (existingUser) {
        userRecordId = existingUser._id;
        // Update the existing user
        await ctx.db.patch(userRecordId, {
            email,
            name,
            emailVerified,
            updatedAt: now,
            role: role !== undefined ? role : existingUser.role,
        });
    } else {
        // Create user record - userId must match the 'subject' in the identity
        userRecordId = await ctx.db.insert('user', {
            userId: userId, // This must match the 'subject' in withIdentity
            email,
            name,
            emailVerified,
            createdAt: now,
            updatedAt: now,
            role: role || null,
            image: null,
            banned: null,
            banReason: null,
            banExpires: null,
        });
    }

    // Create account record (required by better-auth for email/password authentication)
    if (password) {
        // Check if account already exists
        const existingAccount = await ctx.db
            .query('account')
            .withIndex('providerId_userId', q =>
                q.eq('providerId', 'credential').eq('userId', userId)
            )
            .first();

        if (!existingAccount) {
            // In a real scenario, better-auth would hash the password
            // For tests, we can store a placeholder or use a simple hash
            // Note: better-auth handles password hashing internally
            await ctx.db.insert('account', {
                accountId: email, // For email provider, accountId is typically the email
                providerId: 'credential', // better-auth uses "credential" for email/password
                userId: userId,
                password: password, // In real better-auth, this would be hashed
                createdAt: now,
                updatedAt: now,
                accessToken: null,
                refreshToken: null,
                idToken: null,
                accessTokenExpiresAt: null,
                refreshTokenExpiresAt: null,
                scope: null,
            });
        }
    }

    return {
        userId,
        userRecordId: userRecordId,
        email,
        name,
    };
}

/**
 * Helper to create multiple test users at once
 *
 * Note: This requires a context with write access (MutationCtx or equivalent from convex-test)
 */
export async function createTestUsers(
    ctx: { db: MutationCtx['db'] },
    users: Array<{
        userId: string;
        email: string;
        name: string;
        password?: string;
        role?: string;
        emailVerified?: boolean;
    }>
) {
    const results = [];
    for (const user of users) {
        const result = await createTestUser(ctx, user);
        results.push(result);
    }
    return results;
}
