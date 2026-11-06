import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
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
    auditLogs: defineTable({
        userId: v.string(),
        actorUserId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
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
        userId: v.optional(v.string()),
        organizationId: v.string(),
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organizationId'])
        .index('by_organization_name', ['organizationId', 'name']),

    platformCategories: defineTable({
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_name', ['name']),

    objectives: defineTable({
        organizationId: v.string(),
        createdBy: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        unit: v.optional(v.string()),
        deadline: v.optional(v.number()),
        dueSoonDays: v.optional(v.number()),
        direction: objectiveDirectionValidator,
        memberCanView: v.boolean(),
        memberCanEdit: v.boolean(),
        startValue: v.number(),
        currentValue: v.number(),
        targetValue: v.number(),
        status: v.union(v.literal('active'), v.literal('completed')),
        completedAt: v.optional(v.number()),
        deletedAt: v.optional(v.number()),
        deletedBy: v.optional(v.string()),
        purgeToken: v.optional(v.string()),
        purgeStartedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
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
        .index('by_organization_deletedAt_completedAt', [
            'organizationId',
            'deletedAt',
            'completedAt',
        ])
        .index('by_organization_creator_memberCanView_deletedAt', [
            'organizationId',
            'createdBy',
            'memberCanView',
            'deletedAt',
        ])
        .index('by_category', ['categoryId'])
        .index('by_creator_deletedAt_status', ['createdBy', 'deletedAt', 'status'])
        .index('by_status_deletedAt_deadline', ['status', 'deletedAt', 'deadline'])
        .searchIndex('search_title', {
            searchField: 'title',
            filterFields: ['organizationId', 'deletedAt', 'status', 'categoryId'],
        }),

    objectivePermissions: defineTable({
        objectiveId: v.id('objectives'),
        organizationId: v.string(),
        userId: v.string(),
        canEdit: v.boolean(),
        addedBy: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_objective_user', ['objectiveId', 'userId'])
        .index('by_user_organization', ['userId', 'organizationId'])
        .index('by_organization', ['organizationId']),

    obtainedAchievements: defineTable({
        userId: v.string(),
        achievement: v.string(),
        earnedAt: v.number(),
    }).index('by_user_achievement', ['userId', 'achievement']),

    organizationAchievements: defineTable({
        organizationId: v.string(),
        achievement: v.string(),
        earnedAt: v.number(),
        contributedBy: v.string(),
    }).index('by_organization_achievement', ['organizationId', 'achievement']),

    notifications: defineTable({
        userId: v.string(),
        organizationId: v.string(),
        objective: v.optional(v.id('objectives')),
        read: v.boolean(),
        notificationDate: v.number(),
        ...noticeValidator.fields,
    })
        .index('by_user_organization_date', ['userId', 'organizationId', 'notificationDate'])
        .index('by_user_organization_read', ['userId', 'organizationId', 'read'])
        .index('by_objective_type_date', ['objective', 'notificationType', 'notificationDate'])
        .index('by_organization', ['organizationId']),

    notificationPreferences: defineTable({
        userId: v.string(),
        deadline: v.boolean(),
        progress: v.boolean(),
        status: v.boolean(),
        achievement: v.boolean(),
    }).index('by_user', ['userId']),

    progressUpdates: defineTable({
        objective: v.id('objectives'),
        organizationId: v.string(),
        createdBy: v.string(),
        updatedValue: v.number(),
        updateDate: v.number(),
        resultingValue: v.number(),
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
        setupCompletedBy: v.string(),
    }),
});
