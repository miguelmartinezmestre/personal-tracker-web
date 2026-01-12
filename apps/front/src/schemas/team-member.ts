import { z } from 'zod';
export const teamMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(['owner', 'admin', 'member']),
    organizationId: z.string(),
});

export const savedTeamMemberSchema = teamMemberSchema.extend({
    id: z.string(),
    userId: z.string(),
    createdAt: z.date(),
});

export type TeamMember = z.infer<typeof savedTeamMemberSchema>;
export type CreateTeamMember = z.infer<typeof teamMemberSchema>;
