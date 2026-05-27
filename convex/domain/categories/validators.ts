import { v } from 'convex/values';

export const categoryInputValidator = {
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
} as const;

export const categoryPatchValidator = {
    id: v.id('categories'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
} as const;
