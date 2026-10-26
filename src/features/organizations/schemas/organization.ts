import { z } from 'zod';
import { categoryDraftSchema } from '@/features/categories/schemas/category';

type OrganizationValidationKey = 'nameRequired';

export function organizationSchema(message: (key: OrganizationValidationKey) => string) {
    return z.object({
        name: z
            .string()
            .trim()
            .min(1, { error: message('nameRequired') }),
    });
}

export function newOrganizationSchema(message: (key: OrganizationValidationKey) => string) {
    return organizationSchema(message).extend({
        categories: z.array(categoryDraftSchema),
    });
}

export function savedOrganizationSchema(message: (key: OrganizationValidationKey) => string) {
    return organizationSchema(message).extend({
        id: z.string(),
    });
}

export type CreateOrganization = z.infer<ReturnType<typeof newOrganizationSchema>>;

export type SavedOrganization = z.infer<ReturnType<typeof savedOrganizationSchema>>;
