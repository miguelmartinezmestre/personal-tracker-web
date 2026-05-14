import './lib/http-polyfills';
import { authMiddleware } from 'kitcn/auth/http';
import { HttpRouterWithHono } from 'kitcn/server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAuth } from './generated/auth';
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

app.use(authMiddleware(getAuth));

export default new HttpRouterWithHono(app);
