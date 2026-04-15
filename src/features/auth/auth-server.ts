import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';
import { env } from '@/lib/env';

/**
 * Server-side authentication utilities from Better-Auth Next.js integration.
 *
 * Use `preloadAuthQuery` for server components to fetch auth data during SSR.
 * This ensures the data is available immediately on page load without
 * client-side fetching waterfalls.
 *
 * For client components, use `useSession` from `@/features/auth/hooks/use-session`
 * which provides reactive updates via TanStack Query.
 *
 * @example
 * const preloadedUser = await preloadAuthQuery(api.auth.getCurrentUser);
 * return <AppSidebar preloadedUserQuery={preloadedUser} />;
 */
export const { handler, preloadAuthQuery, getToken, fetchAuthQuery, fetchAuthMutation } =
    convexBetterAuthNextJs({
        convexUrl: env.NEXT_PUBLIC_CONVEX_URL,
        convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
    });
