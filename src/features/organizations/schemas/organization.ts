import { z } from 'zod';

export const organizationSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string(),
});

export const savedOrganizationSchema = organizationSchema.extend({
    id: z.string(),
});

export type CreateOrganization = z.infer<typeof organizationSchema>;
