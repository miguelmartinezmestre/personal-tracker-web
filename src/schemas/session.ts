import { User } from "lucide-react";
import { z } from "zod";


export const sessionSchema = z.object({
    userId: z.number(),
    value: z.string(),
    status: z.string(),
    userAgent: z.string().optional().nullable(),
});

export const savedSessionSchema = sessionSchema.extend({
    id: z.number(),
});

export type Session = z.infer<typeof savedSessionSchema>;
export type CreateSession = z.infer<typeof sessionSchema>;