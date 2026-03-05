import { GenericMutationCtx, GenericSchema, SchemaDefinition } from 'convex/server';
import { TestConvex } from 'convex-test';
import { DataModel } from '../_generated/dataModel';

export interface TestUserData {
    docId: string;
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

    const docId = await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
        return await ctx.db.insert('user', {
            name: name,
            email: email,
            role: role ?? null,
            emailVerified: emailVerified ?? false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId: userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    return {
        docId,
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
            createdAt: now,
            metadata: options.description ?? null,
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

export async function createTestObjective(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    options: {
        userId: string;
        organizationId: string;
        title: string;
        targetValue: number;
        currentValue?: number;
        startValue?: number;
        scope?: 'personal' | 'organization';
        status?: string;
        description?: string;
        category?: string;
        deadline?: number;
        unit?: string;
    }
): Promise<string> {
    const now = Date.now();
    const startValue = options.startValue ?? options.currentValue ?? 0;
    return t.run(async (ctx: GenericMutationCtx<DataModel>) => {
        return await ctx.db.insert('objectives', {
            userId: options.userId,
            organizationId: options.organizationId,
            scope: options.scope ?? 'personal',
            title: options.title,
            description: options.description,
            category: options.category,
            targetValue: options.targetValue,
            currentValue: startValue,
            startValue,
            deadline: options.deadline,
            status: options.status ?? (startValue >= options.targetValue ? 'completed' : 'active'),
            unit: options.unit,
            createdAt: now,
            updatedAt: now,
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
