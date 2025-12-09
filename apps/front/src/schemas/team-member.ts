import { z } from 'zod';

export const teamMemberSchema = z.object({
    email: z.string().email(),
    teamId: z.number(),
    role: z.string(),
});

export const savedTeamMemberSchema = teamMemberSchema.extend({
    _id: z.number()
});

export type TeamMember = z.infer<typeof savedTeamMemberSchema>;
export type CreateTeamMember = z.infer<typeof teamMemberSchema>;