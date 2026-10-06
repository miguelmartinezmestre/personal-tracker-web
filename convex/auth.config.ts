import { getAuthConfigProvider } from 'kitcn/auth/config';
import type { AuthConfig } from 'convex/server';
import { env } from './_generated/server';

export default {
    providers: [getAuthConfigProvider({ jwks: env.JWKS?.trim() || undefined })],
} satisfies AuthConfig;
