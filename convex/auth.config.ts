import { getAuthConfigProvider } from 'kitcn/auth/config';
import type { AuthConfig } from 'convex/server';
import { authEnv } from './lib/authEnv';

export default {
    providers: [getAuthConfigProvider({ jwks: authEnv.JWKS })],
} satisfies AuthConfig;
