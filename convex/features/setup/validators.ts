import { v } from 'convex/values';
import { categoryInputValidator } from '../categories/validators';

export const completeSetupArgsValidator = {
    platformName: v.string(),
    defaultLanguage: v.union(v.literal('en'), v.literal('es')),
    registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),
    categories: v.array(categoryInputValidator),
} as const;
