import { z } from 'zod';
import { OBJECTIVE_STATUS } from '@/convex/utils/constants';
import { isCategorySelectPlaceholder } from '@/features/objectives/lib/objective-category-selection';

export const objectiveStatusSchema = z.enum([OBJECTIVE_STATUS.ACTIVE, OBJECTIVE_STATUS.COMPLETED]);

const categorySelectionSchema = z
    .string()
    .optional()
    .nullable()
    .refine(value => !isCategorySelectPlaceholder(value), {
        message: 'Select a valid category',
    });

export const objectiveSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),

    categoryId: categorySelectionSchema,
    targetValue: z.number(),
    currentValue: z.number(),
    startValue: z.number().optional().nullable(),
    deadline: z.number().optional().nullable(),
    status: objectiveStatusSchema.optional().nullable(),
    unit: z.string().optional().nullable(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    _id: z.string(),
});

export type Objective = z.infer<typeof savedObjectiveSchema>;
export type CreateObjective = z.infer<typeof objectiveSchema>;
export type SavedObjectiveForm = z.infer<typeof savedObjectiveSchema>;
