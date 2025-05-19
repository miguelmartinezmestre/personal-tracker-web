import { z } from 'zod';

export const schema = z.object({
    id: z.number().optional(),
    goalId: z.number().optional(),
    updatedValue: z.number().min(1, { message: 'Updated value is required' }),
    updateDate: z.date().describe('label:updateDate'),
    comment: z.string().optional().describe('label:comment'),
});
