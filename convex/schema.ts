import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),

  // users: defineTable({
  //   email: v.string(),
  //   password: v.string(),
  //   username: v.optional(v.string()),
  //   resetPasswordKey: v.optional(v.string()),
  //   role: v.union(
  //     v.literal("ADMIN"),
  //     v.literal("USER")
  //   ),
  // })
  // .index("by_email", ["email"]),

  sessions: defineTable({
    user: v.id("users"),
    value: v.string(),
    status: v.string(),
    userAgent: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["user"]),

  objectives: defineTable({
    user: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    targetValue: v.number(),
    currentValue: v.number(),
    deadline: v.optional(v.number()),
    status: v.string(),
    unit: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["user"]),

  progressUpdates: defineTable({
    objective: v.id("objectives"),
    updatedValue: v.number(),
    updateDate: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_objective", ["objective"]),

  notifications: defineTable({
    user: v.id("users"),
    objective: v.id("objectives"),
    read: v.boolean(),
    notificationType: v.string(),
    notificationDate: v.number(),
    message: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["user"])
  .index("by_objective", ["objective"]),

  auditLogs: defineTable({
    user: v.id("users"),
    action: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["user"]),

  teams: defineTable({
    name: v.string(),
    description: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  teamMembers: defineTable({
    team: v.id("teams"),
    user: v.id("users"),
    role: v.union(
      v.literal("MANAGER"),
      v.literal("MEMBER")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_team", ["team"])
  .index("by_user", ["user"]),
});
