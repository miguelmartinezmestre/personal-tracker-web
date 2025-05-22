import { z } from 'zod';

export const updateProgressSchema = z.object({
    id: z.number().optional(),
    objectiveId: z.number().optional(),
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date().describe('label:updateDate'),
    comment: z.string().nullable().describe('label:comment'),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
    id: z.number()
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;