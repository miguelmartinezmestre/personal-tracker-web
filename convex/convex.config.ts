import { defineApp } from 'convex/server';
import { v } from 'convex/values';
import aggregate from '@convex-dev/aggregate/convex.config.js';

const app = defineApp({
    env: {
        SITE_URL: v.optional(v.string()),
        BETTER_AUTH_URL: v.optional(v.string()),
        BETTER_AUTH_SECRET: v.string(),
        JWKS: v.optional(v.string()),
        SETUP_SECRET: v.optional(v.string()),
        EMAIL_FROM: v.optional(v.string()),
        SMTP_HOST: v.optional(v.string()),
        SMTP_PORT: v.optional(v.string()),
        SMTP_USER: v.optional(v.string()),
        SMTP_PASSWORD: v.optional(v.string()),
        SMTP_SECURE: v.optional(v.string()),
    },
});
app.use(aggregate, { name: 'objectiveStats' });

export default app;
