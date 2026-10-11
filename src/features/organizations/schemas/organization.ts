import { z } from 'zod';

const ORGANIZATION_NAME_MAX_LENGTH = 100;

type OrganizationValidationKey = 'nameRequired' | 'nameTooLong';

export function organizationSchema(message: (key: OrganizationValidationKey) => string) {
    return z.object({
        name: z
            .string()
            .trim()
            .min(1, { error: message('nameRequired') })
            .max(ORGANIZATION_NAME_MAX_LENGTH, { error: message('nameTooLong') }),
        description: z.string(),
    });
}

export function savedOrganizationSchema(message: (key: OrganizationValidationKey) => string) {
    return organizationSchema(message).extend({
        id: z.string(),
    });
}

export type CreateOrganization = z.infer<ReturnType<typeof organizationSchema>>;
export type SavedOrganization = z.infer<ReturnType<typeof savedOrganizationSchema>>;
