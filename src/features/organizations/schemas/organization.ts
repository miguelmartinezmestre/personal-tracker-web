import { z } from 'zod';

export const organizationSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string(),
});

export const savedOrganizationSchema = organizationSchema.extend({
    id: z.string(),
    slug: z.string().optional(),
    isPersonal: z.boolean().optional(),
    role: z.enum(['owner', 'admin', 'member']).optional(),
});

export type Organization = z.infer<typeof savedOrganizationSchema>;
export type CreateOrganization = z.infer<typeof organizationSchema>;
