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

export default defineSchema({
    ...authSchema.tables,

    objectives: defineTable({
        organizationId: v.id('organization'),
        userId: v.id('user'),
        scope: objectiveScopeValidator,
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
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
        .index('by_organization', ['organizationId'])
        .index('by_organization_scope', ['organizationId', 'scope'])
        .index('by_organization_scope_status', ['organizationId', 'scope', 'status'])
        .index('by_status', ['status']),

    progressUpdates: defineTable({
        objective: v.id('objectives'),
        updatedValue: v.number(),
        updateDate: v.number(),
        comment: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective', ['objective'])
        .index('by_objective_date', ['objective', 'updateDate']),

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
        .index('by_objective', ['objective']),

    auditLogs: defineTable({
        userId: v.id('user'),
        organizationId: v.id('organization'),
        action: v.string(),
        resourceType: v.string(), // 'objective' | 'progress_update' | 'organization' | 'organization_member' | 'category' | 'user' | 'session' | 'permission'
        resourceId: v.optional(v.string()), // ID of the affected resource
        metadata: v.optional(
            v.object({
                before: v.optional(v.any()), // State before change (for updates/deletes)
                after: v.optional(v.any()), // State after change (for creates/updates)
                context: v.optional(v.string()), // Additional context
            })
        ),
        severity: v.string(), // 'info' | 'warning' | 'critical'
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
        .index('by_organization', ['organizationId']),

    // Achievement definitions - what achievements exist
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

    // User achievements - which users earned which achievements
    obtainedAchievements: defineTable({
        userId: v.id('user'),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_achievement', ['userId', 'achievement']),

    // Organization achievements - which organizations earned which achievements
    organizationAchievements: defineTable({
        organization: v.id('organization'),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        contributingUsers: v.array(v.id('user')),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organization'])
        .index('by_organization_achievement', ['organization', 'achievement']),
});
