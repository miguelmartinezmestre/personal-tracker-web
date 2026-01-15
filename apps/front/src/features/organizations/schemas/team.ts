import { z } from 'zod';

export const teamSchema = z.object({
    name: z.string(),
    description: z.string(),
});

export const savedTeamSchema = teamSchema.extend({
    id: z.string(),
    slug: z.string().optional(),
});

export type Team = z.infer<typeof savedTeamSchema>;
export type CreateTeam = z.infer<typeof teamSchema>;
