import { z } from 'zod';
import {
    CATEGORY_COLOR_PATTERN,
    CATEGORY_ICONS,
    CATEGORY_NAME_MAX_LENGTH,
} from '@/convex/features/categories/constants';

type CategoryValidationKey = 'nameRequired' | 'nameTooLong';

export const categoryIconSchema = z.enum(CATEGORY_ICONS);

// A category being chosen or edited in a list, where an invalid name is only highlighted.
export const categoryDraftSchema = z.object({
    name: z.string().trim().min(1).max(CATEGORY_NAME_MAX_LENGTH),
    color: z.string().regex(CATEGORY_COLOR_PATTERN),
    icon: categoryIconSchema.optional(),
});

export function categorySchema(message: (key: CategoryValidationKey) => string) {
    return categoryDraftSchema.extend({
        name: z
            .string()
            .trim()
            .min(1, { error: message('nameRequired') })
            .max(CATEGORY_NAME_MAX_LENGTH, { error: message('nameTooLong') }),
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
