import { v } from 'convex/values';

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

export const sessionListItemValidator = v.object({
    id: v.id('session'),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
    ipAddress: v.union(v.string(), v.null()),
    userAgent: v.union(v.string(), v.null()),
    isCurrent: v.boolean(),
});
