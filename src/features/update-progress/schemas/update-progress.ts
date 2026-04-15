import { z } from 'zod';

export const updateProgressSchema = z.object({
    updatedValue: z.number(),
    updateDate: z.date(),
    comment: z.string().nullable(),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
    _id: z.string(),
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;
