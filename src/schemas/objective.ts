import { z } from 'zod';

export const objectiveSchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    targetValue: z
        .number()
        .min(0, { message: 'Target value is required' }),
    currentValue: z
        .number()
        .min(0, { message: 'Current value is required' }),
    deadline: z.date().optional().nullable(),
    status: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
});

export const savedObjectiveSchema = objectiveSchema.extend({
    id: z.number()
});

export const updateObjectiveSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    targetValue: z.number().optional(),
    currentValue: z.number().optional(),
    deadline: z.date().optional(),
});

