import { z } from 'zod';
import { PROGRESS_COMMENT_MAX_LENGTH } from '@shared/input-constraints';
import { currentUtcCivilDay, toUtcCivilDay } from '@shared/civil-date';

export const updateProgressSchema = z.object({
    updatedValue: z.number(),
    updateDate: z
        .number()
        .refine(
            value => toUtcCivilDay(value) <= currentUtcCivilDay(),
            'Future dates are not allowed'
        ),
    comment: z.string().max(PROGRESS_COMMENT_MAX_LENGTH).nullable(),
});

export const savedUpdateProgressSchema = updateProgressSchema.extend({
    _id: z.string(),
});

export type UpdateProgress = z.infer<typeof savedUpdateProgressSchema>;
export type CreateUpdateProgress = z.infer<typeof updateProgressSchema>;
