import { z } from 'zod';
import { Id } from '@/convex/_generated/dataModel';
import {
    CATEGORY_COLOR_PATTERN,
    CATEGORY_ICONS,
    CATEGORY_NAME_MAX_LENGTH,
} from '@shared/input-constraints';

export const categoryColorSchema = z
    .string()
    .regex(CATEGORY_COLOR_PATTERN, 'Color must be a valid hex code (e.g. #FF5733)');

export const categoryIconSchema = z.enum(CATEGORY_ICONS);

export const categorySchema = z.object({
    name: z.string().trim().min(1).max(CATEGORY_NAME_MAX_LENGTH),
    color: categoryColorSchema,
    icon: categoryIconSchema.optional(),
});

export const savedCategorySchema = categorySchema.extend({
    id: z.custom<Id<'categories'>>(),
});

export type Category = z.infer<typeof savedCategorySchema>;
export type CreateCategory = z.infer<typeof categorySchema>;
