import { z } from 'zod';

export const organizationMemberSchema = z.object({
    email: z.email(),
    role: z.enum(['owner', 'admin', 'member']),
    organizationId: z.string(),
    // Off by default: accepting doesn't need a verified email unless the inviter asks (decision 9).
    requireEmailVerification: z.boolean(),
});

export const savedOrganizationMemberSchema = organizationMemberSchema
    .omit({ requireEmailVerification: true })
    .extend({
        id: z.string(),
        userId: z.string(),
        createdAt: z.date(),
    });

export type OrganizationMember = z.infer<typeof savedOrganizationMemberSchema>;

export type CreateOrganizationMember = z.infer<typeof organizationMemberSchema>;
