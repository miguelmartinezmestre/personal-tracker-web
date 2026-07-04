import { v } from 'convex/values';

export const setupDefaultLanguageValidator = v.union(v.literal('en'), v.literal('es'));

export const setupRegistrationPolicyValidator = v.union(
    v.literal('open'),
    v.literal('invitation-only')
);

export const setupCategoryValidator = v.object({
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
});

export const completeSetupArgsValidator = {
    platformName: v.string(),
    defaultLanguage: setupDefaultLanguageValidator,
    registrationPolicy: setupRegistrationPolicyValidator,
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),
    categories: v.array(setupCategoryValidator),
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
