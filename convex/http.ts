import './lib/http-polyfills';
import { authMiddleware } from 'better-convex/auth';
import { HttpRouterWithHono } from 'better-convex/server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { env } from './lib/env';

const app = new Hono();

app.use(
    '/api/*',
    cors({
        origin: env.SITE_URL,
        allowHeaders: ['Content-Type', 'Authorization', 'Better-Auth-Cookie'],
        exposeHeaders: ['Set-Better-Auth-Cookie'],
        credentials: true,
    })
);

app.use(authMiddleware(createAuth));

export default new HttpRouterWithHono(app);
