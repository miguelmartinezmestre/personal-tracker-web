import { z } from "zod";

export const categorySchema = z.object({
    name: z.string(),
    objectives: z.array(z.number()),
    // createdAt: z.date().nullable(),
    // updatedAt: z.date().nullable(),
});

export const savedCategorySchema = categorySchema.extend({
    _id: z.string(),
});

export type Category = z.infer<typeof savedCategorySchema>;
export type CreateCategory = z.infer<typeof categorySchema>;