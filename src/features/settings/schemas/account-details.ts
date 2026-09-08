import { z } from 'zod';

export const accountDetailsSchema = z.object({
    email: z.email(),
    username: z.string().min(3),
});
