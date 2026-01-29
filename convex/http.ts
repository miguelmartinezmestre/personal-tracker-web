import './lib/http-polyfills';
import { authMiddleware } from 'better-convex/auth';
import { HttpRouterWithHono } from 'better-convex/server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';

const app = new Hono();

// CORS for API routes
app.use(
  '/api/*',
  cors({
    origin: process.env.SITE_URL!,
    allowHeaders: ['Content-Type', 'Authorization', 'Better-Auth-Cookie'],
    exposeHeaders: ['Set-Better-Auth-Cookie'],
    credentials: true,
  }),
);

// Better Auth middleware
app.use(authMiddleware(createAuth));

export default new HttpRouterWithHono(app);