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
