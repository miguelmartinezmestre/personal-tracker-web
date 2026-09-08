import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import authSchema from './authSchema';
import { vWorkflowId } from '@convex-dev/workflow';
import {
    objectiveStatusValidator,
    objectiveVisibilityValidator,
    objectiveCollaboratorRoleValidator,
    notificationTypeValidator,
    achievementTypeValidator,
    achievementCategoryValidator,
    achievementTierValidator,
} from './utils/validators';

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

    dashboardMigrations: defineTable({
        organizationId: v.id('organization'),
        generation: v.number(),
        phase: v.union(v.literal('objectives'), v.literal('progress'), v.literal('ready')),
        cursor: v.optional(v.union(v.string(), v.null())),
        updatedAt: v.number(),
    }).index('by_organization', ['organizationId']),
    dashboardResyncs: defineTable({
        organizationId: v.id('organization'),
        objectiveId: v.id('objectives'),
        revision: v.number(),
        pending: v.boolean(),
    })
        .index('by_objective', ['objectiveId'])
        .index('by_organization_pending', ['organizationId', 'pending']),
    dashboardNamespaces: defineTable({
        organizationId: v.id('organization'),
        namespace: v.string(),
        kind: v.union(v.literal('objectives'), v.literal('progress')),
    })
        .index('by_organization', ['organizationId'])
        .index('by_namespace_kind', ['namespace', 'kind']),

    objectives: defineTable({
        organizationId: v.id('organization'),
        createdBy: v.id('user'),
        ownerId: v.id('user'),
        visibility: objectiveVisibilityValidator,
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        targetValue: v.number(),
        currentValue: v.number(),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: objectiveStatusValidator,
        completedAt: v.optional(v.number()),
        // Optional during rollout so the bounded backfill can migrate existing rows.
        earlyBirdCompleted: v.optional(v.boolean()),
        unit: v.optional(v.string()),
        workflowId: v.optional(vWorkflowId),
        deletedAt: v.optional(v.number()),
        deletedBy: v.optional(v.id('user')),
        purgeToken: v.optional(v.string()),
        purgeStartedAt: v.optional(v.number()),
        ownerDeletionProcessedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        // Creator/org scoped metrics; prefix `createdBy` supports creator-wide reads.
        .index('by_createdBy_organization', ['createdBy', 'organizationId'])
        .index('by_createdBy_status', ['createdBy', 'status'])
        .index('by_createdBy_organization_status', ['createdBy', 'organizationId', 'status'])
        .index('by_createdBy_earlyBirdCompleted', ['createdBy', 'earlyBirdCompleted'])
        .index('by_createdBy_organization_earlyBirdCompleted', [
            'createdBy',
            'organizationId',
            'earlyBirdCompleted',
        ])
        .index('by_earlyBirdCompleted', ['earlyBirdCompleted'])
        .index('by_owner', ['ownerId'])
        .index('by_owner_organization_deletedAt', ['ownerId', 'organizationId', 'deletedAt'])
        .index('by_owner_organization_ownerDeletionProcessedAt', [
            'ownerId',
            'organizationId',
            'ownerDeletionProcessedAt',
        ])
        .index('by_owner_ownerDeletionProcessedAt', ['ownerId', 'ownerDeletionProcessedAt'])
        // Listings stay scoped by organization; composite indexes keep optional filters bounded.
        .index('by_organization', ['organizationId'])
        .index('by_organization_status', ['organizationId', 'status'])
        .index('by_organization_createdAt', ['organizationId', 'createdAt'])
        .index('by_organization_completedAt', ['organizationId', 'completedAt'])
        .index('by_organization_deletedAt', ['organizationId', 'deletedAt'])
        .index('by_organization_deletedAt_status', ['organizationId', 'deletedAt', 'status'])
        .index('by_organization_deletedAt_categoryId', [
            'organizationId',
            'deletedAt',
            'categoryId',
        ])
        .index('by_organization_deletedAt_status_categoryId', [
            'organizationId',
            'deletedAt',
            'status',
            'categoryId',
        ])
        .index('by_organization_visibility', ['organizationId', 'visibility'])
        .index('by_organization_deadline', ['organizationId', 'deadline'])
        .index('by_organization_deletedAt_deadline', ['organizationId', 'deletedAt', 'deadline'])
        .index('by_organization_deletedAt_status_deadline', [
            'organizationId',
            'deletedAt',
            'status',
            'deadline',
        ])
        .index('by_organization_deletedAt_categoryId_deadline', [
            'organizationId',
            'deletedAt',
            'categoryId',
            'deadline',
        ])
        .index('by_organization_deletedAt_status_categoryId_deadline', [
            'organizationId',
            'deletedAt',
            'status',
            'categoryId',
            'deadline',
        ])
        .index('by_status_deadline', ['status', 'deadline'])
        .index('by_status_deletedAt_deadline', ['status', 'deletedAt', 'deadline'])
        .index('by_categoryId', ['categoryId'])
        .searchIndex('search_title_by_organization_status_categoryId', {
            searchField: 'title',
            filterFields: ['organizationId', 'deletedAt', 'status', 'categoryId'],
        }),

    objectiveCollaborators: defineTable({
        objectiveId: v.id('objectives'),
        userId: v.id('user'),
        organizationId: v.id('organization'),
        role: objectiveCollaboratorRoleValidator,
        addedBy: v.id('user'),
        createdAt: v.number(),
    })
        .index('by_objective', ['objectiveId'])
        .index('by_objective_role_createdAt', ['objectiveId', 'role', 'createdAt'])
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_objective_user', ['objectiveId', 'userId'])
        .index('by_user_organization', ['userId', 'organizationId']),

    progressUpdates: defineTable({
        objective: v.id('objectives'),
        createdBy: v.id('user'),
        organizationId: v.id('organization'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective_date', ['objective', 'updateDate'])
        .index('by_createdBy_date', ['createdBy', 'updateDate'])
        .index('by_createdBy_organization_date', ['createdBy', 'organizationId', 'updateDate'])
        .index('by_organization_date', ['organizationId', 'updateDate']),

    notifications: defineTable({
        userId: v.id('user'),
        organizationId: v.id('organization'),
        objective: v.optional(v.id('objectives')),
        read: v.boolean(),
        notificationType: notificationTypeValidator,
        notificationDate: v.number(),
        message: v.string(),
        messageKey: v.optional(v.string()),
        messageParams: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_user_organization_date', ['userId', 'organizationId', 'notificationDate'])
        .index('by_user_organization_read', ['userId', 'organizationId', 'read'])
        .index('by_user_organization_read_type', [
            'userId',
            'organizationId',
            'read',
            'notificationType',
        ])
        .index('by_objective_type_date', ['objective', 'notificationType', 'notificationDate']),

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
        severity: v.string(),
        createdAt: v.number(),
    })
        .index('by_createdAt', ['createdAt'])
        .index('by_organization', ['organizationId'])
        .index('by_resourceType_resourceId', ['resourceType', 'resourceId'])
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

    achievementDefinitions: defineTable({
        code: v.string(),
        type: achievementTypeValidator,
        category: achievementCategoryValidator,
        tier: achievementTierValidator,
        threshold: v.number(),
        icon: v.string(),
        points: v.number(),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }),

    obtainedAchievements: defineTable({
        userId: v.id('user'),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_achievement', ['userId', 'achievement']),

    organizationAchievements: defineTable({
        organization: v.id('organization'),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_organization_achievement', ['organization', 'achievement']),

    organizationAchievementContributors: defineTable({
        organizationAchievementId: v.id('organizationAchievements'),
        userId: v.id('user'),
        contributedAt: v.number(),
        contributionValue: v.optional(v.number()),
    }).index('by_organizationAchievement_user', ['organizationAchievementId', 'userId']),

    platformSettings: defineTable({
        platformName: v.string(),
        defaultLanguage: v.union(v.literal('en'), v.literal('es')),
        registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
        setupCompletedAt: v.optional(v.number()),
        setupCompletedBy: v.optional(v.id('user')),
    }),

    notificationPreferences: defineTable({
        userId: v.id('user'),
        achievementNotifications: v.boolean(),
        deadlineNotifications: v.boolean(),
        progressNotifications: v.boolean(),
        organizationNotifications: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_user', ['userId']),

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
        // Keep the Better Auth table contract: the adapter may persist null
        // for an optional role even though organization invitations normally
        // supply the default `member` value.
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
        .index('by_email_status_expiresAt', ['email', 'status', 'expiresAt']),
});
