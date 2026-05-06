import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import authSchema from './authSchema';
import {
    objectiveStatusValidator,
    objectiveScopeValidator,
    notificationTypeValidator,
    achievementTypeValidator,
    achievementCategoryValidator,
    achievementTierValidator,
} from './utils/validators';


const auditPrimitive = v.union(
    v.string(),
    v.number(),
    v.boolean(),
    v.null()
);


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
        userId: v.id('user'),
        scope: objectiveScopeValidator,
        title: v.string(),
        description: v.optional(v.string()),

        category: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        targetValue: v.number(),
        currentValue: v.number(),
        startValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: objectiveStatusValidator,
        unit: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_scope', ['userId', 'scope'])
        .index('by_user_scope_status', ['userId', 'scope', 'status'])
        .index('by_user_status', ['userId', 'status'])
        .index('by_user_status_deadline', ['userId', 'status', 'deadline'])
        .index('by_user_createdAt', ['userId', 'createdAt'])
        .index('by_user_status_updatedAt', ['userId', 'status', 'updatedAt'])
        .index('by_user_scope_status_category', ['userId', 'scope', 'status', 'category'])
        .index('by_user_scope_category', ['userId', 'scope', 'category'])
        .index('by_user_organization', ['userId', 'organizationId'])
        .index('by_organization', ['organizationId'])
        .index('by_organization_scope', ['organizationId', 'scope'])
        .index('by_organization_scope_status', ['organizationId', 'scope', 'status'])
        .index('by_organization_scope_status_category', [
            'organizationId',
            'scope',
            'status',
            'category',
        ])
        .index('by_organization_scope_category', ['organizationId', 'scope', 'category'])
        .index('by_status', ['status'])
        .index('by_categoryId', ['categoryId']),

    progressUpdates: defineTable({
        objective: v.id('objectives'),
        userId: v.id('user'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective', ['objective'])
        .index('by_objective_date', ['objective', 'updateDate'])
        .index('by_user_date', ['userId', 'updateDate'])
        .index('by_user_objective', ['userId', 'objective']),

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
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_user_date', ['userId', 'notificationDate'])
        .index('by_user_read', ['userId', 'read'])
        .index('by_user_type_read', ['userId', 'notificationType', 'read'])
        .index('by_objective', ['objective'])
        .index('by_objective_type_date', ['objective', 'notificationType', 'notificationDate']),

    auditLogs: defineTable({
        userId: v.id('user'),
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
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_createdAt', ['createdAt'])
        .index('by_resourceType', ['resourceType'])
        .index('by_resourceType_resourceId', ['resourceType', 'resourceId']),

    categories: defineTable({
        userId: v.id('user'),
        organizationId: v.id('organization'),
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
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
    })
        .index('by_code', ['code'])
        .index('by_type', ['type']),

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
        contributorCount: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organization'])
        .index('by_organization_achievement', ['organization', 'achievement']),

    organizationAchievementContributors: defineTable({
        organizationAchievementId: v.id('organizationAchievements'),
        userId: v.id('user'),
        contributedAt: v.number(),
        contributionValue: v.optional(v.number()),
    })
        .index('by_organizationAchievement', ['organizationAchievementId'])
        .index('by_user', ['userId'])
        .index('by_organizationAchievement_user', ['organizationAchievementId', 'userId']),

    platformSettings: defineTable({
        platformName: v.string(),
        defaultLanguage: v.string(),
        registrationPolicy: v.string(),
        setupCompletedAt: v.optional(v.number()),
        setupCompletedBy: v.optional(v.id('user')),
    }),

    notificationPreferences: defineTable({
        userId: v.id('user'),
        achievementNotifications: v.boolean(),
        deadlineNotifications: v.boolean(),
        progressNotifications: v.boolean(),
        organizationNotifications: v.boolean(),
        emailDigestEnabled: v.optional(v.boolean()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_achievement', ['userId', 'achievementNotifications']),


    member: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        role: v.string(),
        createdAt: v.number(),
    })
        .index('organizationId', ['organizationId'])
        .index('userId', ['userId'])
        .index('role', ['role'])
        .index('by_organizationId_and_userId', ['organizationId', 'userId']),


    invitation: defineTable({
        organizationId: v.string(),
        email: v.string(),
        role: v.optional(v.string()),
        status: v.string(),
        expiresAt: v.number(),
        createdAt: v.number(),
        inviterId: v.string(),
    })
        .index('organizationId', ['organizationId'])
        .index('email', ['email'])
        .index('role', ['role'])
        .index('status', ['status'])
        .index('inviterId', ['inviterId'])
        .index('by_email_status_expiresAt', ['email', 'status', 'expiresAt'])
        .index('by_status_expiresAt', ['status', 'expiresAt']),
});
