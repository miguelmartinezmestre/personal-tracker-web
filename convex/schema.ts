import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import authSchema from './authSchema';

const auditPrimitive = v.union(v.string(), v.number(), v.boolean(), v.null());

const auditValueLevel1 = v.union(
    auditPrimitive,
    v.array(auditPrimitive),
    v.record(v.string(), auditPrimitive)
);

const auditMetadataSnapshot = v.union(
    auditValueLevel1,
    v.array(auditValueLevel1),
    v.record(v.string(), auditValueLevel1)
);

export default defineSchema({
    ...authSchema.tables,

    auditLogs: defineTable({
        userId: v.id('user'),
        actorUserId: v.optional(v.id('user')),
        organizationId: v.id('organization'),
        action: v.string(),
        resourceType: v.string(),
        resourceId: v.optional(v.string()),
        metadata: v.optional(
            v.object({
                before: v.optional(auditMetadataSnapshot),
                after: v.optional(auditMetadataSnapshot),
                context: v.optional(v.string()),
            })
        ),
        createdAt: v.number(),
    })
        .index('by_createdAt', ['createdAt'])
        .index('by_organization', ['organizationId'])
        .index('by_resourceType_createdAt', ['resourceType', 'createdAt']),

    categories: defineTable({
        userId: v.optional(v.id('user')),
        organizationId: v.id('organization'),
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organizationId'])
        .index('by_organization_name', ['organizationId', 'name']),

    objectives: defineTable({
        organizationId: v.id('organization'),
        createdBy: v.id('user'),
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        unit: v.optional(v.string()),
        deadline: v.optional(v.number()),
        startValue: v.number(),
        currentValue: v.number(),
        targetValue: v.number(),
        status: v.union(v.literal('active'), v.literal('completed')),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization_createdAt', ['organizationId', 'createdAt'])
        .index('by_organization_status_createdAt', ['organizationId', 'status', 'createdAt']),

    progressUpdates: defineTable({
        objective: v.id('objectives'),
        organizationId: v.id('organization'),
        createdBy: v.id('user'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective_date', ['objective', 'updateDate'])
        .index('by_organization', ['organizationId']),

    platformSettings: defineTable({
        platformName: v.string(),
        defaultLanguage: v.union(v.literal('en'), v.literal('es')),
        registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
        setupCompletedBy: v.id('user'),
    }),

    user: defineTable({
        name: v.string(),
        email: v.string(),
        emailVerified: v.boolean(),
        image: v.optional(v.union(v.null(), v.string())),
        createdAt: v.number(),
        updatedAt: v.number(),
        userId: v.optional(v.union(v.null(), v.string())),
        role: v.optional(v.union(v.null(), v.string())),
        banned: v.optional(v.union(v.null(), v.boolean())),
        banReason: v.optional(v.union(v.null(), v.string())),
        banExpires: v.optional(v.union(v.null(), v.number())),
        deletedAt: v.optional(v.number()),
    })
        .index('email_name', ['email', 'name'])
        .index('name', ['name'])
        .index('userId', ['userId'])
        .index('by_role', ['role'])
        .searchIndex('search_user_name', { searchField: 'name' })
        .searchIndex('search_user_email', { searchField: 'email' }),

    session: defineTable({
        expiresAt: v.number(),
        token: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
        ipAddress: v.optional(v.union(v.null(), v.string())),
        userAgent: v.optional(v.union(v.null(), v.string())),
        userId: v.string(),
        impersonatedBy: v.optional(v.union(v.null(), v.string())),
        activeOrganizationId: v.optional(v.union(v.null(), v.string())),
    })
        .index('expiresAt', ['expiresAt'])
        .index('expiresAt_userId', ['expiresAt', 'userId'])
        .index('token', ['token'])
        .index('userId', ['userId'])
        .index('activeOrganizationId', ['activeOrganizationId'])
        .index('by_userId_and_activeOrganizationId', ['userId', 'activeOrganizationId']),

    member: defineTable({
        organizationId: v.id('organization'),
        userId: v.id('user'),
        role: v.string(),
        createdAt: v.number(),
    })
        .index('organizationId', ['organizationId'])
        .index('userId', ['userId'])
        .index('role', ['role'])
        .index('by_organizationId_and_role_createdAt', ['organizationId', 'role', 'createdAt'])
        .index('by_organizationId_and_userId', ['organizationId', 'userId']),

    invitation: defineTable({
        organizationId: v.id('organization'),
        email: v.string(),
        role: v.optional(v.union(v.null(), v.string())),
        status: v.string(),
        expiresAt: v.number(),
        createdAt: v.number(),
        inviterId: v.id('user'),
    })
        .index('organizationId', ['organizationId'])
        .index('email', ['email'])
        .index('role', ['role'])
        .index('status', ['status'])
        .index('inviterId', ['inviterId'])
        .index('by_email_status_expiresAt', ['email', 'status', 'expiresAt'])
        .index('by_organizationId_status_expiresAt', ['organizationId', 'status', 'expiresAt']),
});
