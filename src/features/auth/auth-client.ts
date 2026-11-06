import { createAuthClient } from 'better-auth/react';
import type { BetterAuthClientPlugin } from 'better-auth/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { mutationOptions, type UseMutationOptions } from '@tanstack/react-query';
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
            },
        }),
    ],
});

type SignOutMutationOptions = Omit<UseMutationOptions, 'mutationFn'>;

export function useSignOutMutationOptions(options: SignOutMutationOptions = {}) {
    return mutationOptions({
        ...options,
        mutationFn: async () => {
            const result = await authClient.signOut();

            if (result.error) {
                throw new Error(result.error.message ?? 'Sign out failed');
            }
        },
    });
}
