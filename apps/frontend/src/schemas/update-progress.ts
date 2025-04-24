import { z } from 'zod';

export const schema = z.object({
    id: z.number().optional(),
    goalId: z.number().optional(),
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date(),
    comment: z.string().min(1, { message: 'Comment is required' }),
});
