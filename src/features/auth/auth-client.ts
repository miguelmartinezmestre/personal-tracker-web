import { createAuthClient } from 'better-auth/react';
import type { BetterAuthClientPlugin } from 'better-auth/client';
import { convexClient } from 'kitcn/auth/client';
import { adminClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthMutations } from 'kitcn/react';
import { NEXT_PUBLIC_SITE_URL } from '@/lib/env';
import { platformRoles } from '@/convex/features/auth/roles';

const accountDeletionClient = () =>
    ({
        id: 'account-deletion-client',
        getActions: ($fetch, $store) => ({
            softDeleteUser: async ({ password }: { password: string }) => {
                const result = await $fetch<{ success: boolean }>('/soft-delete-user', {
                    method: 'POST',
                    body: { password },
                });

                if (!result.error) {
                    $store.notify('$sessionSignal');
                }

                return result;
            },
        }),
    }) satisfies BetterAuthClientPlugin;

export const authClient = createAuthClient({
    baseURL: NEXT_PUBLIC_SITE_URL,
    plugins: [
        convexClient(),
        accountDeletionClient(),
        adminClient({
            roles: platformRoles,
        }),
        organizationClient({
            schema: {
                organization: {
                    additionalFields: {
                        slug: { type: 'string' },
                        logo: { type: 'string' },
                    },
                },
                invitation: {
                    additionalFields: {
                        requireEmailVerification: { type: 'boolean', required: false },
                    },
                },
            },
        }),
    ],
});

export const { useSignOutMutationOptions } = createAuthMutations(authClient);
