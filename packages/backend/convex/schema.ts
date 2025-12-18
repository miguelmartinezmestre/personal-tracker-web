import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { tables as betterAuthTables } from './betterAuth/schema';

export default defineSchema({
    ...betterAuthTables,

    objectives: defineTable({
        user: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(),
        unit: v.optional(v.string()),
        objectiveType: v.optional(v.string()),
        period: v.optional(v.string()),
        periodStart: v.optional(v.number()),
        periodLengthDays: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_user', ['user']),

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
        user: v.string(),
        objective: v.id('objectives'),
        read: v.boolean(),
        notificationType: v.string(),
        notificationDate: v.number(),
        message: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_user', ['user'])
        .index('by_objective', ['objective']),

    auditLogs: defineTable({
        user: v.string(),
        action: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_user', ['user']),

    categories: defineTable({
        user: v.string(),
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_user', ['user']),
});
