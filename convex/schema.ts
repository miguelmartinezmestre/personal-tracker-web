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
        unit: v.optional(v.string()),
        workflowId: v.optional(vWorkflowId),
        deletedAt: v.optional(v.number()),
        deletedBy: v.optional(v.id('user')),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        // Creator/org scoped metrics; prefix `createdBy` supports creator-wide reads.
        .index('by_createdBy_organization', ['createdBy', 'organizationId'])
        .index('by_owner', ['ownerId'])
        // Listings stay scoped by organization; optional filters are applied after this index.
        .index('by_organization', ['organizationId'])
        .index('by_organization_visibility', ['organizationId', 'visibility'])
        .index('by_organization_deadline', ['organizationId', 'deadline'])
        .index('by_status_deadline', ['status', 'deadline'])
        .index('by_categoryId', ['categoryId'])
        .searchIndex('search_title_by_organization_status_categoryId', {
            searchField: 'title',
            filterFields: ['organizationId', 'status', 'categoryId'],
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
        .index('by_user', ['userId'])
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
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user_organization_date', ['userId', 'organizationId', 'notificationDate'])
        .index('by_user_organization_read', ['userId', 'organizationId', 'read'])
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
        .index('by_resourceType_resourceId', ['resourceType', 'resourceId'])
        .index('by_resourceType_createdAt', ['resourceType', 'createdAt']),

    categories: defineTable({
        userId: v.id('user'),
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
    })
        .index('email_name', ['email', 'name'])
        .index('name', ['name'])
        .index('userId', ['userId'])
        .searchIndex('search_user_name', { searchField: 'name' })
        .searchIndex('search_user_email', { searchField: 'email' }),

    member: defineTable({
        organizationId: v.id('organization'),
        userId: v.id('user'),
        role: v.string(),
        createdAt: v.number(),
    })
        .index('organizationId', ['organizationId'])
        .index('userId', ['userId'])
        .index('role', ['role'])
        .index('by_organizationId_and_userId', ['organizationId', 'userId']),

    invitation: defineTable({
        organizationId: v.id('organization'),
        email: v.string(),
        role: v.optional(v.string()),
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
