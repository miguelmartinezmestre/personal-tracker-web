import { z } from 'zod';
export const organizationMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']),
  organizationId: z.string(),
});

export const savedOrganizationMemberSchema = organizationMemberSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
});

export type OrganizationMember = z.infer<typeof savedOrganizationMemberSchema>;
export type CreateOrganizationMember = z.infer<typeof organizationMemberSchema>;
