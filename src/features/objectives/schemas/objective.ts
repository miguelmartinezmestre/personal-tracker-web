import { z } from 'zod';

export const objectiveStatusSchema = z.enum(['active', 'completed']);
export const objectiveScopeSchema = z.enum(['personal', 'organization']);

export type ObjectiveStatus = z.infer<typeof objectiveStatusSchema>;
export type ObjectiveScope = z.infer<typeof objectiveScopeSchema>;

export const objectiveSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    targetValue: z.number(),
    currentValue: z.number(),
    startValue: z.number().optional().nullable(),
    deadline: z.number().optional().nullable(),
    status: objectiveStatusSchema.optional().nullable(),
    scope: objectiveScopeSchema,
    unit: z.string().optional().nullable(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    _id: z.string(),
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;
