import { z } from 'zod';

export const updateProgressSchema = z.object({
    id: z.number().optional(),
    objectiveId: z.number().optional(),
    updatedValue: z.number().positive({ message: 'Updated value must be greater than 0' }),
    updateDate: z.date().describe('label:updateDate'),
    comment: z.string().nullable().describe('label:comment'),
    // createdAt: z.date().nullable().nullable(),
    // updatedAt: z.date().nullable().nullable(),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
    _id: z.string(),
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;
