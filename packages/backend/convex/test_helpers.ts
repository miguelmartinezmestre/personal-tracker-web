import { components } from './_generated/api';
import { MutationCtx } from './_generated/server';
import { BetterAuthDataModel } from './rls';

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
    ctx: { db: MutationCtx['db']; runQuery: MutationCtx['runQuery']; runMutation: MutationCtx['runMutation'] },
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
    const existingUser = (await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [{ field: "userId", value: userId }],
            }
        )) as BetterAuthDataModel["user"]["document"] | null;

    let userRecordId;
    if (existingUser) {
        userRecordId = existingUser._id;
        // Update the existing user
        await ctx.runMutation(
            components.betterAuth.adapter.updateOne,
            {
                input: {
                    model: "user",
                    update: {
                        email: email,
                        name: name,
                        emailVerified: emailVerified,
                        updatedAt: now,
                        role: role !== undefined ? role : existingUser.role,
                    },
                    where: [{ field: "_id", value: userRecordId }],
                },
            }
        );
    } else {
        // Create user record - userId must match the 'subject' in the identity
        const userRecord = (await ctx.runMutation(
            components.betterAuth.adapter.create,
            {
                input: {
                    data: {
                        userId: userId,
                        email: email,
                        name: name,
                        emailVerified: emailVerified,
                        createdAt: now,
                        updatedAt: now,
                        role: role !== undefined ? role : null,
                        image: null,
                        banned: null,
                        banReason: null,
                        banExpires: null,
                    },
                    model: "user",
                },
            }
        )) as BetterAuthDataModel["user"]["document"];
        userRecordId = userRecord._id;
    }

    // Create account record (required by better-auth for email/password authentication)
    if (password) {
        // Check if account already exists
        const existingAccount = (await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "account",
              where: [{ field: "providerId", value: 'credential' }, { field: "userId", value: userId }],
              paginationOpts: {
                cursor: null,
                numItems: 1,
              },
            }
        )) as BetterAuthDataModel["account"]["document"] | null;

        if (!existingAccount) {
            // In a real scenario, better-auth would hash the password
            // For tests, we can store a placeholder or use a simple hash
            // Note: better-auth handles password hashing internally
            await ctx.runMutation(
                components.betterAuth.adapter.create,
                {
                  input: {
                    data: {
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
                    },
                    model: "account",
                  },
                }
            )

            await ctx.runMutation(
                components.betterAuth.adapter.create,
                {
                  input: {
                    data: {
                      userId: userId,
                      email: email,
                      name: name,
                      emailVerified: emailVerified,
                      createdAt: now,
                      updatedAt: now,
                      role: role || null,
                      image: null,
                      banned: null,
                      banReason: null,
                      banExpires: null,
                    },
                    model: "user",
                  },
                }
            )
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
    ctx: { db: MutationCtx['db']; runQuery: MutationCtx['runQuery']; runMutation: MutationCtx['runMutation'] },
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
