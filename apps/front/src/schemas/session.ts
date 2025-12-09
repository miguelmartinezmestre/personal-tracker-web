import { z } from "zod";


export const sessionSchema = z.object({
    userId: z.number(),
    value: z.string(),
    status: z.string(),
    userAgent: z.string().optional().nullable(),
    // createdAt: z.date().nullable(),
    // updatedAt: z.date().nullable(),
});

export const savedSessionSchema = sessionSchema.extend({
    _id: z.string(),
});

export type Session = z.infer<typeof savedSessionSchema>;
export type CreateSession = z.infer<typeof sessionSchema>;