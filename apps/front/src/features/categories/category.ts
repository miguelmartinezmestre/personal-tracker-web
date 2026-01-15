import { z } from 'zod';
import { Id } from '@repo/backend/convex/_generated/dataModel';

export const categoryColorSchema = z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #FF5733)');

export const categoryIconSchema = z.enum([
    'tag',
    'heart',
    'briefcase',
    'book',
    'user',
    'dollar-sign',
    'users',
    'palette',
    'home',
    'map',
    'target',
    'trending-up',
    'star',
    'award',
    'zap',
    'coffee',
    'music',
    'camera',
    'plane',
]);

export const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
    color: categoryColorSchema,
    icon: categoryIconSchema.optional(),
});

export const savedCategorySchema = categorySchema.extend({
    id: z.custom<Id<'categories'>>(),
});

export type Category = z.infer<typeof savedCategorySchema>;
export type CreateCategory = z.infer<typeof categorySchema>;
