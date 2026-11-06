import type { BetterAuthOptions } from 'better-auth/minimal';
import { admin, organization } from 'better-auth/plugins';
import { convex } from '@convex-dev/better-auth/plugins';
import { platformAdminRoles, platformRoles } from './roles';

// Everything here shapes the Better Auth tables. The runtime options in options.ts reuse these
// values, and the component builds its adapter and schema from authSchemaOptions, which must not
// read environment variables or the request context.

export const userAdditionalFields = {
    deletedAt: { type: 'number', required: false, input: false },
} as const;

export const organizationSchema = {
    invitation: {
        additionalFields: {
            requireEmailVerification: {
                type: 'boolean',
                required: false,
                defaultValue: true,
                input: false,
            },
        },
    },
} as const;

export const adminPluginOptions = {
    adminRoles: platformAdminRoles,
    roles: platformRoles,
};

export const authSchemaOptions = {
    user: { additionalFields: userAdditionalFields },
    plugins: [
        convex({ authConfig: { providers: [{ applicationID: 'convex', domain: '' }] } }),
        admin(adminPluginOptions),
        organization({ schema: organizationSchema }),
    ],
} satisfies BetterAuthOptions;
