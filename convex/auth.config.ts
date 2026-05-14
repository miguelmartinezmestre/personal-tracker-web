import { getAuthConfigProvider } from 'kitcn/auth/config';
import type { AuthConfig } from 'convex/server';

export default {
    providers: [getAuthConfigProvider({ jwks: process.env.JWKS })],
} satisfies AuthConfig;
