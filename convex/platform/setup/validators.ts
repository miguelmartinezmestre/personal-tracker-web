import { v } from 'convex/values';

export const setupCategoryValidator = v.object({
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
});

export const completeSetupArgsValidator = {
    platformName: v.string(),
    defaultLanguage: v.string(),
    registrationPolicy: v.string(),
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),
    categories: v.array(setupCategoryValidator),
    userId: v.id('user'),
} as const;

export const ensureTestOrganizationArgsValidator = {
    organizationName: v.optional(v.string()),
    createPersonalCategory: v.optional(v.boolean()),
} as const;

export const ensureTestOrganizationInternalArgsValidator = {
    userId: v.id('user'),
    organizationName: v.optional(v.string()),
    createPersonalCategory: v.optional(v.boolean()),
} as const;
