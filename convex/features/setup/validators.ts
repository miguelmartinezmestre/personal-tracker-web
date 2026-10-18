import { v } from 'convex/values';

export const completeSetupArgsValidator = {
    platformName: v.string(),
    defaultLanguage: v.union(v.literal('en'), v.literal('es')),
    registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),
    categories: v.array(
        v.object({
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
        })
    ),
} as const;
