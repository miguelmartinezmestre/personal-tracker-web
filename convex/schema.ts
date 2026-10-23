import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import authSchema from './features/auth/authSchema';
import { objectiveDirectionValidator } from './features/objectives/validators';
import { auditSeverityValidator } from './features/audit/validators';
import { noticeValidator } from './features/notifications/validators';

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

    // Insert and read only: never updated or deleted, not even with its organization (decision 15).
    auditLogs: defineTable({
        userId: v.id('user'),
        actorUserId: v.optional(v.id('user')),
        // Platform actions, such as a global admin banning a user, belong to no organization.
        organizationId: v.optional(v.id('organization')),
        action: v.string(),
        resourceType: v.string(),
        resourceId: v.optional(v.string()),
        severity: auditSeverityValidator,
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
        .index('by_organization_createdAt', ['organizationId', 'createdAt'])
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

    // The catalog organizations choose from; what they choose is copied, never linked (decision 13).
    platformCategories: defineTable({
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_name', ['name']),

    objectives: defineTable({
        organizationId: v.id('organization'),
        createdBy: v.id('user'),
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        unit: v.optional(v.string()),
        deadline: v.optional(v.number()),
        // Days before the deadline from which the objective counts as due soon; only with a deadline.
        dueSoonDays: v.optional(v.number()),
        direction: objectiveDirectionValidator,
        // What the member role may do; owner, admins and the creator always have full access.
        memberCanView: v.boolean(),
        memberCanEdit: v.boolean(),
        startValue: v.number(),
        currentValue: v.number(),
        targetValue: v.number(),
        status: v.union(v.literal('active'), v.literal('completed')),
        completedAt: v.optional(v.number()),
        // In the trash from `deletedAt`; a purge in progress holds `purgeToken` so stale batches
        // stop and the objective can no longer be restored.
        deletedAt: v.optional(v.number()),
        deletedBy: v.optional(v.id('user')),
        purgeToken: v.optional(v.string()),
        purgeStartedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        // Every combination of the status and category filters, newest first or by deadline.
        // `deletedAt` stays undefined until the objective goes to the trash, which it then orders.
        .index('by_organization_deletedAt_createdAt', ['organizationId', 'deletedAt', 'createdAt'])
        .index('by_organization_deletedAt_status_createdAt', [
            'organizationId',
            'deletedAt',
            'status',
            'createdAt',
        ])
        .index('by_organization_deletedAt_category_createdAt', [
            'organizationId',
            'deletedAt',
            'categoryId',
            'createdAt',
        ])
        .index('by_organization_deletedAt_status_category_createdAt', [
            'organizationId',
            'deletedAt',
            'status',
            'categoryId',
            'createdAt',
        ])
        .index('by_organization_deletedAt_deadline', ['organizationId', 'deletedAt', 'deadline'])
        .index('by_organization_deletedAt_status_deadline', [
            'organizationId',
            'deletedAt',
            'status',
            'deadline',
        ])
        .index('by_organization_deletedAt_category_deadline', [
            'organizationId',
            'deletedAt',
            'categoryId',
            'deadline',
        ])
        .index('by_organization_deletedAt_status_category_deadline', [
            'organizationId',
            'deletedAt',
            'status',
            'categoryId',
            'deadline',
        ])
        // Objectives completed lately, for the dashboard activity.
        .index('by_organization_deletedAt_completedAt', [
            'organizationId',
            'deletedAt',
            'completedAt',
        ])
        // A member's own private objectives, for the dashboard.
        .index('by_organization_creator_memberCanView_deletedAt', [
            'organizationId',
            'createdBy',
            'memberCanView',
            'deletedAt',
        ])
        // Any objective blocks deleting its category, even private or in the trash.
        .index('by_category', ['categoryId'])
        // The creator's own objectives in every organization, for their achievements.
        .index('by_creator_deletedAt_status', ['createdBy', 'deletedAt', 'status'])
        // Active deadlines across organizations, for the daily notifications.
        .index('by_status_deletedAt_deadline', ['status', 'deletedAt', 'deadline'])
        .searchIndex('search_title', {
            searchField: 'title',
            filterFields: ['organizationId', 'deletedAt', 'status', 'categoryId'],
        }),

    // One row per (objective, user) with an individual permission; edit always comes with view.
    objectivePermissions: defineTable({
        objectiveId: v.id('objectives'),
        organizationId: v.id('organization'),
        userId: v.id('user'),
        canEdit: v.boolean(),
        addedBy: v.id('user'),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective_user', ['objectiveId', 'userId'])
        .index('by_user_organization', ['userId', 'organizationId'])
        .index('by_organization', ['organizationId']),

    // Earned once and kept for good (INH-LOG-03).
    obtainedAchievements: defineTable({
        userId: v.id('user'),
        achievement: v.string(),
        earnedAt: v.number(),
    }).index('by_user_achievement', ['userId', 'achievement']),

    organizationAchievements: defineTable({
        organizationId: v.id('organization'),
        achievement: v.string(),
        earnedAt: v.number(),
        // Whoever did what unlocked it (INH-LOG-04).
        contributedBy: v.id('user'),
    }).index('by_organization_achievement', ['organizationId', 'achievement']),

    notifications: defineTable({
        userId: v.id('user'),
        organizationId: v.id('organization'),
        // Optional: an achievement of the user or the organization has none (REQ-NOTIFICACIONES-004).
        objective: v.optional(v.id('objectives')),
        read: v.boolean(),
        notificationDate: v.number(),
        ...noticeValidator.fields,
    })
        .index('by_user_organization_date', ['userId', 'organizationId', 'notificationDate'])
        .index('by_user_organization_read', ['userId', 'organizationId', 'read'])
        .index('by_objective_type_date', ['objective', 'notificationType', 'notificationDate'])
        .index('by_organization', ['organizationId']),

    // One row per user who changed a default; every kind of notification is on until then.
    notificationPreferences: defineTable({
        userId: v.id('user'),
        deadline: v.boolean(),
        progress: v.boolean(),
        status: v.boolean(),
        achievement: v.boolean(),
    }).index('by_user', ['userId']),

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
        .index('by_organization_date', ['organizationId', 'updateDate'])
        .index('by_createdBy_date', ['createdBy', 'updateDate'])
        .index('by_organization_createdAt', ['organizationId', 'createdAt']),

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
        // Chosen by whoever invites; off by default (decision 9).
        requireEmailVerification: v.optional(v.boolean()),
    })
        .index('organizationId', ['organizationId'])
        .index('email', ['email'])
        .index('role', ['role'])
        .index('status', ['status'])
        .index('inviterId', ['inviterId'])
        .index('by_email_status_expiresAt', ['email', 'status', 'expiresAt'])
        .index('by_organizationId_status_expiresAt', ['organizationId', 'status', 'expiresAt']),
});
