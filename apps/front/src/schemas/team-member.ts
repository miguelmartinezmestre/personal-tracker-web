import { z } from 'zod';
import { Id } from '@repo/backend/convex/_generated/dataModel';

export const teamMemberSchema = z.object({
    email: z.string().email(),
    userId: z.string(),
    role: z.enum(['MANAGER', 'MEMBER']),
    organizationId: z.string(),
});

export const savedTeamMemberSchema = teamMemberSchema.extend({
    _id: z.custom<Id<'member'>>(),
    _creationTime: z.number(),
    createdAt: z.number(),
});

export type TeamMember = z.infer<typeof savedTeamMemberSchema>;
export type CreateTeamMember = z.infer<typeof teamMemberSchema>;