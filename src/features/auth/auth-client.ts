import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthMutations } from 'better-convex/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL!,
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

// Export mutation hooks for TanStack Query
export const {
  useSignOutMutationOptions,
  useSignInSocialMutationOptions,
  useSignInMutationOptions,
  useSignUpMutationOptions,
} = createAuthMutations(authClient);
