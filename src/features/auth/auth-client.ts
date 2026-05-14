import { createAuthClient } from 'better-auth/react';
import { convexClient } from 'kitcn/auth/client';
import { adminClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthMutations } from 'kitcn/react';
import { env } from '@/lib/env';

export const authClient = createAuthClient({
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    plugins: [
        convexClient(),
        adminClient(),
        organizationClient({
            schema: {
                organization: {
                    additionalFields: {
                        slug: { type: 'string' },
                        description: { type: 'string' },
                        logo: { type: 'string' },
                    },
                },
            },
        }),
    ],
});

export const { useSignOutMutationOptions } = createAuthMutations(authClient);
