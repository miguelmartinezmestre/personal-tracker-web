import { z } from 'zod';

export const objectiveSchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    targetValue: z.number(),
    currentValue: z.number(),
    deadline: z.date().optional().nullable(),
    status: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    id: z.number()
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;