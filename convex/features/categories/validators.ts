import { v } from 'convex/values';

export const categoryInputValidator = v.object({
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
});
