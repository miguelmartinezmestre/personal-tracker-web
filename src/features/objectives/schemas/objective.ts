import { z } from 'zod';
import { dateInputToUtcTimestamp, todayDateInput } from '@/features/objectives/lib/dates';

export const NONE_CATEGORY = 'none';

export const objectiveFormSchema = z
    .object({
        title: z.string().trim().min(1).max(120),
        description: z.string().max(2000),
        categoryId: z.string(),
        unit: z.string().max(32),
        startValue: z.number().min(0),
        targetValue: z.number().min(0.001),
        deadline: z
            .string()
            .refine(value => value === '' || dateInputToUtcTimestamp(value) !== undefined),
    })
    .refine(value => value.startValue < value.targetValue, { path: ['startValue'] });

export type ObjectiveFormValues = z.infer<typeof objectiveFormSchema>;

export const progressFormSchema = z.object({
    updatedValue: z.number().positive(),
    updateDate: z
        .string()
        .refine(value => dateInputToUtcTimestamp(value) !== undefined)
        // Date inputs use ISO strings, so lexical order matches calendar order.
        .refine(value => value <= todayDateInput()),
    comment: z.string().max(500),
});

export type ProgressFormValues = z.infer<typeof progressFormSchema>;
