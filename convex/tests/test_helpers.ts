import { GenericSchema, SchemaDefinition } from 'convex/server';
import { TestConvex } from 'convex-test';
import { MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

const defaultTestSessionIds = new WeakMap<
    TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    Map<Id<'user'>, Id<'session'>>
>();

function setDefaultTestSessionId(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    userId: Id<'user'>,
    sessionId: Id<'session'>
) {
    const sessions = defaultTestSessionIds.get(t) ?? new Map<Id<'user'>, Id<'session'>>();
    sessions.set(userId, sessionId);
    defaultTestSessionIds.set(t, sessions);
}

export function getDefaultTestSessionId(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    userId: Id<'user'>
): Id<'session'> | undefined {
    return defaultTestSessionIds.get(t)?.get(userId);
}

export interface TestUserData {
    docId: Id<'user'>;
    userId: string;
    email: string;
    name: string;
    password?: string;
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

    const docId = await t.run(async (ctx: MutationCtx) => {
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
        password: options.password,
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
): Promise<Id<'organization'>> {
    const now = Date.now();
    return t.run(async (ctx: MutationCtx) => {
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
        organizationId: Id<'organization'>;
        userId: Id<'user'>;
        role: string;
    }
): Promise<Id<'member'>> {
    const now = Date.now();
    const memberId = await t.run(async (ctx: MutationCtx) => {
        return await ctx.db.insert('member', {
            organizationId: options.organizationId,
            userId: options.userId,
            role: options.role,
            createdAt: now,
        });
    });

    const sessionId = await createTestSession(t, {
        userId: options.userId,
        activeOrganizationId: options.organizationId,
        expiresAt: now + 60_000,
        token: `test-member-session-${String(options.userId)}-${String(options.organizationId)}-${now}-${Math.random()
            .toString(36)
            .slice(2)}`,
    });
    setDefaultTestSessionId(t, options.userId, sessionId);

    return memberId;
}

export async function createTestObjective(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    options: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        title: string;
        targetValue: number;
        currentValue?: number;
        startValue?: number;
        /** @deprecated tenant model removed objective scope; accepted but ignored. */
        scope?: 'personal' | 'organization';
        status?: 'active' | 'completed';
        description?: string;
        categoryId?: Id<'categories'>;
        deadline?: number;
        unit?: string;
    }
): Promise<Id<'objectives'>> {
    const now = Date.now();
    const startValue = options.startValue ?? options.currentValue ?? 0;
    return t.run(async (ctx: MutationCtx) => {
        return await ctx.db.insert('objectives', {
            userId: options.userId,
            organizationId: options.organizationId,
            title: options.title,
            description: options.description,
            categoryId: options.categoryId,
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
        userId: Id<'user'>;
        token: string;
        expiresAt: number;
        ipAddress?: string | null;
        userAgent?: string | null;
        activeOrganizationId?: Id<'organization'> | null;
    }
): Promise<Id<'session'>> {
    const now = Date.now();
    return t.run(async (ctx: MutationCtx) => {
        return await ctx.db.insert('session', {
            userId: options.userId,
            expiresAt: options.expiresAt,
            token: options.token,
            ipAddress: options.ipAddress ?? null,
            userAgent: options.userAgent ?? null,
            activeOrganizationId: options.activeOrganizationId ?? null,
            createdAt: now,
            updatedAt: now,
        });
    });
}
