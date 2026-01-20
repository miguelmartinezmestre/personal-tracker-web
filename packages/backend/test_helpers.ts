import { GenericMutationCtx, GenericQueryCtx, GenericSchema, SchemaDefinition } from 'convex/server';
import { TestConvex } from 'convex-test';
import { DataModel } from './convex/betterAuth/_generated/dataModel';
import { components } from './convex/_generated/api';

export interface TestUserData {
    userId: string;
    email: string;
    name: string;
    role?: string;
}

export async function createTestUser(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
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

    await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
        const existing = await ctx.db
            .query('user')
            .filter(q => q.eq(q.field('userId'), userId))
            .first();

        if (existing) {
            await ctx.runMutation(components.betterAuth.adapter.updateOne, {
                input:{
                    model:"user",
                    where:[{ field: '_id', value: existing._id }],
                    update:{
                        name: name,
                        email: email,
                        role: role ?? null,
                        emailVerified: emailVerified ?? false,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        userId: userId,
                        image: "https://example.com/image.png",
                        banExpires: null,
                        banReason: null,
                        banned: false,
                    }
                }
            });
        }

        await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
                model: "user",
                data: {
                    name: name,
                    email: email,
                    role: role ?? null,
                    emailVerified: emailVerified ?? false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    userId: userId,
                    image: "https://example.com/image.png",
                    banExpires: null,
                    banReason: null,
                    banned: false,
                }
            }
        });
    });

    return {
        userId,
        email,
        name,
        role,
    };
}

export async function createTestUsers(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
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
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    options: {
        name: string;
        slug: string;
        description?: string | null;
    }
): Promise<string> {
    const now = Date.now();
    return t.run(async (ctx: GenericMutationCtx<DataModel>) => {
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
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    options: {
        organizationId: string;
        userId: string;
        role: string;
    }
): Promise<string> {
    const now = Date.now();
    return t.run(async (ctx: GenericMutationCtx<DataModel>) => {
        return await ctx.db.insert('member', {
            organizationId: options.organizationId,
            userId: options.userId,
            role: options.role,
            createdAt: now,
        });
    });
}

export async function createTestSession(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    options: {
        userId: string;
        token: string;
        expiresAt: number;
        ipAddress?: string | null;
        userAgent?: string | null;
    }
): Promise<string> {
    const now = Date.now();
    return t.run(async (ctx: GenericMutationCtx<DataModel>) => {
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
