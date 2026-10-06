import type { GenericSchema, SchemaDefinition } from 'convex/server';
import type { TestConvex } from 'convex-test';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { z } from 'zod';
import { asTestId } from './test.casts';

const defaultTestSessionIds = new WeakMap<
    TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    Map<Id<'user'>, Id<'session'>>
>();

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

    const sessions = defaultTestSessionIds.get(t) ?? new Map<Id<'user'>, Id<'session'>>();
    sessions.set(options.userId, sessionId);
    defaultTestSessionIds.set(t, sessions);

    return memberId;
}

export async function ensureTestUserAuth(
    t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
    userId: Id<'user'>,
    options?: {
        organizationId?: Id<'organization'>;
        organizationName?: string;
        role?: string;
    }
): Promise<{ organizationId: Id<'organization'>; sessionId: Id<'session'> }> {
    let organizationId = options?.organizationId;

    if (!organizationId) {
        const suffix = Math.random().toString(36).slice(2, 10);
        organizationId = await createTestOrganization(t, {
            name: options?.organizationName ?? `Test Org ${suffix}`,
            slug: `test-org-${suffix}`,
        });
    }

    await createTestMember(t, {
        organizationId,
        userId,
        role: options?.role ?? 'owner',
    });

    const sessionId = getDefaultTestSessionId(t, userId);
    if (!sessionId) {
        throw new Error(`Failed to create test session for user ${userId}`);
    }

    return { organizationId, sessionId };
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

export function readScheduledFunctionArg(row: {
    readonly args: readonly (string | number | boolean | null | object | undefined)[];
}): { trigger?: string; userId?: Id<'user'> } | undefined {
    const value = row.args[0];
    const parsed = z
        .object({ trigger: z.string().optional(), userId: z.string().optional() })
        .safeParse(value);
    if (!parsed.success) return undefined;
    const trigger = parsed.data.trigger;
    const userIdValue = parsed.data.userId;
    if (userIdValue === undefined) {
        return { trigger };
    }
    return {
        trigger,
        userId: asTestId<'user'>(userIdValue),
    };
}
