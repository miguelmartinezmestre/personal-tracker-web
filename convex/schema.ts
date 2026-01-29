import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import authSchema from './authSchema';

export default defineSchema({

    ...authSchema.tables,

    objectives: defineTable({
        organizationId: v.string(),
        userId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(), // 'active' | 'paused' | 'completed' | 'archived' | 'deleted'
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
        collaborators: v.optional(v.array(v.string())),
        createdAt: v.number(),
        updatedAt: v.number(),
        // Workflow fields
        workflowId: v.optional(v.string()),     // ID of the active workflow
        nextTickAt: v.optional(v.number()),     // Timestamp of next scheduled tick
        nextTickSeq: v.optional(v.number()),    // Monotonic counter for anti-race pattern
    })
    .index('by_user', ['userId'])
    .index('by_organization', ['organizationId'])
    .index('by_organization_user', ['organizationId', 'userId'])
    .index('by_workflow', ['workflowId'])
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
        userId: v.string(),
        organizationId: v.string(),
        objective: v.optional(v.id('objectives')),
        read: v.boolean(),
        notificationType: v.string(), // 'deadline' | 'progress' | 'status' | 'achievement'
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
        userId: v.string(),
        organizationId: v.string(),
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
        .index('by_action', ['action']),

    categories: defineTable({
        userId: v.string(),
        organizationId: v.string(),
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
        type: v.string(), // 'individual' | 'organization'
        category: v.string(), // 'milestone' | 'streak' | 'completion' | 'activity'
        tier: v.string(), // 'bronze' | 'silver' | 'gold' | 'platinum'
        threshold: v.number(),
        icon: v.string(),
        points: v.number(),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_code', ['code'])
        .index('by_type', ['type'])
        .index('by_category', ['category'])
        .index('by_isActive', ['isActive'])
        .index('by_type_active', ['type', 'isActive']),

    // User achievements - which users earned which achievements
    obtainedAchievements: defineTable({
        userId: v.string(),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_achievement', ['userId', 'achievement'])
        .index('by_earned_at', ['earnedAt']),

    // Organization achievements - which organizations earned which achievements
    organizationAchievements: defineTable({
        organization: v.string(),
        achievement: v.id('achievementDefinitions'),
        earnedAt: v.number(),
        contributingUsers: v.array(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organization'])
        .index('by_organization_achievement', ['organization', 'achievement'])
        .index('by_earned_at', ['earnedAt']),

});
