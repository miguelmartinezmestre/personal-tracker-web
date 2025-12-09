import { z } from 'zod';

export const objectiveSchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    targetValue: z.number(),
    currentValue: z.number(),
    deadline: z.number().optional().nullable(),
    status: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    // createdAt: z.date().nullable(),
    // updatedAt: z.date().nullable(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    _id: z.string()
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;