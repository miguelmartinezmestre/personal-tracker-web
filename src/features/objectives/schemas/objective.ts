import { z } from 'zod';
import { OBJECTIVE_STATUS, OBJECTIVE_SCOPE } from '@/convex/utils/constants';

export const objectiveStatusSchema = z.enum([OBJECTIVE_STATUS.ACTIVE, OBJECTIVE_STATUS.COMPLETED]);

export const objectiveScopeSchema = z.enum([
    OBJECTIVE_SCOPE.PERSONAL,
    OBJECTIVE_SCOPE.ORGANIZATION,
]);

export const objectiveSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),

    categoryId: z.string().optional().nullable(),
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


export const createObjectiveFormSchema = objectiveSchema.omit({ categoryId: true });

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof createObjectiveFormSchema>;
