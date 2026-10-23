import { v } from 'convex/values';
import { GLOBAL_ADMIN_ROLE, USER_ROLE } from './roles';

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

export const platformRoleValidator = v.union(v.literal(GLOBAL_ADMIN_ROLE), v.literal(USER_ROLE));

export const adminUserValidator = v.object({
    id: v.id('user'),
    name: v.string(),
    email: v.string(),
    role: platformRoleValidator,
    banned: v.boolean(),
    banReason: v.union(v.string(), v.null()),
    banExpires: v.union(v.number(), v.null()),
    createdAt: v.number(),
});
