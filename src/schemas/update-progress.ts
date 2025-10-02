import { z } from 'zod';

export const updateProgressBeforeCreateSchema = z.object({
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date().describe('label:updateDate'),
    comment: z.string().nullable().describe('label:comment'),
});

export const updateProgressSchema = z.object({
    id: z.number().optional(),
    objectiveId: z.number().optional(),
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date().describe('label:updateDate'),
    comment: z.string().nullable().describe('label:comment'),
    // createdAt: z.date().nullable().nullable(),
    // updatedAt: z.date().nullable().nullable(),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
    _id: z.string()
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;
export type CreateUpdateProgressBeforeCreate = z.infer<typeof updateProgressBeforeCreateSchema>;