import { v } from 'convex/values';
import {
    achievementCategoryValidator,
    achievementTierValidator,
    achievementTypeValidator,
    notificationTypeValidator,
    objectiveStatusValidator,
    objectiveVisibilityValidator,
} from './validators';

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

export const userDocumentValidator = v.object({
    _id: v.id('user'),
    _creationTime: v.number(),
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
});

export const objectiveDocumentValidator = v.object({
    _id: v.id('objectives'),
    _creationTime: v.number(),
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
    earlyBirdCompleted: v.optional(v.boolean()),
    unit: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id('user')),
    purgeToken: v.optional(v.string()),
    purgeStartedAt: v.optional(v.number()),
    ownerDeletionProcessedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const categoryDocumentValidator = v.object({
    _id: v.id('categories'),
    _creationTime: v.number(),
    userId: v.optional(v.id('user')),
    organizationId: v.id('organization'),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const progressUpdateDocumentValidator = v.object({
    _id: v.id('progressUpdates'),
    _creationTime: v.number(),
    objective: v.id('objectives'),
    createdBy: v.id('user'),
    organizationId: v.id('organization'),
    updatedValue: v.number(),
    updateDate: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const notificationDocumentValidator = v.object({
    _id: v.id('notifications'),
    _creationTime: v.number(),
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
});

export const notificationPreferencesDocumentValidator = v.object({
    _id: v.id('notificationPreferences'),
    _creationTime: v.number(),
    userId: v.id('user'),
    achievementNotifications: v.boolean(),
    deadlineNotifications: v.boolean(),
    progressNotifications: v.boolean(),
    organizationNotifications: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const achievementDefinitionDocumentValidator = v.object({
    code: v.string(),
    type: achievementTypeValidator,
    category: achievementCategoryValidator,
    tier: achievementTierValidator,
    threshold: v.number(),
    icon: v.string(),
    points: v.number(),
});

export const obtainedAchievementDocumentValidator = v.object({
    _id: v.id('obtainedAchievements'),
    _creationTime: v.number(),
    userId: v.id('user'),
    achievement: v.string(),
    earnedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const organizationAchievementDocumentValidator = v.object({
    _id: v.id('organizationAchievements'),
    _creationTime: v.number(),
    organization: v.id('organization'),
    achievement: v.string(),
    earnedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export const auditLogDocumentValidator = v.object({
    _id: v.id('auditLogs'),
    _creationTime: v.number(),
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
});
