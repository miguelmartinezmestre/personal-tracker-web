import { z } from 'zod';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICONS } from '@/convex/features/categories/constants';

type CategoryValidationKey = 'nameRequired';

export const categoryIconSchema = z.enum(CATEGORY_ICONS);

// A category being chosen or edited in a list, where an invalid name is only highlighted.
export const categoryDraftSchema = z.object({
    name: z.string().trim().min(1),
    color: z.string().regex(CATEGORY_COLOR_PATTERN),
    icon: categoryIconSchema.optional(),
});

export function categorySchema(message: (key: CategoryValidationKey) => string) {
    return categoryDraftSchema.extend({
        name: z
            .string()
            .trim()
            .min(1, { error: message('nameRequired') }),
    });
}

export type CategoryDraft = z.infer<typeof categoryDraftSchema>;

export function toCategoryDraft(category: { name: string; color: string; icon?: string }) {
    return {
        name: category.name,
        color: category.color,
        icon: categoryIconSchema.safeParse(category.icon).data,
    };
}
