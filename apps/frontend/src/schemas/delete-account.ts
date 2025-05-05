import { z } from 'zod';

export const formSchema = z.object({
    id: z.number(),
});
