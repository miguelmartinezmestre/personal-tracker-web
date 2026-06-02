import { z } from 'zod';

export const organizationSchema = z.object({
    name: z.string(),
    description: z.string(),
});

export const savedOrganizationSchema = organizationSchema.extend({
    id: z.string(),
    slug: z.string().optional(),
    isPersonal: z.boolean().optional(),
});

export type Organization = z.infer<typeof savedOrganizationSchema>;
export type CreateOrganization = z.infer<typeof organizationSchema>;
