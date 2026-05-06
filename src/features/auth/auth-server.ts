import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';
import { env } from '@/lib/env';

export const { handler, preloadAuthQuery, getToken, fetchAuthQuery, fetchAuthMutation } =
    convexBetterAuthNextJs({
        convexUrl: env.NEXT_PUBLIC_CONVEX_URL,
        convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
    });
