import { z } from 'zod';

export const updateProgressSchema = z.object({
  updatedValue: z.number(),
  updateDate: z.date().describe('label:updateDate'),
  comment: z.string().nullable().describe('label:comment'),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
  _id: z.string(),
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;
