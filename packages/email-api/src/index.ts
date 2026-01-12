import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import routes from './routes';

export interface Env {
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    EMAIL_FROM?: string;
    SITE_URL?: string;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: origin => {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
                'http://localhost:3000',
            ];
            return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
        },
        credentials: true,
    })
);

// Mount routes
app.route('/api/email', routes);

// Root endpoint
app.get('/', c => {
    return c.json({
        name: '@repo/email-api',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/email/health',
            verify: 'GET /api/email/verify',
            send: 'POST /api/email/send',
            welcome: 'POST /api/email/welcome',
            passwordReset: 'POST /api/email/password-reset',
            deadlineReminder: 'POST /api/email/deadline-reminder',
        },
    });
});

// Start server if this file is run directly
const PORT = Number(process.env.PORT) ?? 3001;

// Dynamic import for server startup (only when run directly)
const startServer = async () => {
    const { serve } = await import('@hono/node-server');
    serve({
        fetch: app.fetch,
        port: PORT,
    });
    console.log(`Email API server running on http://localhost:${PORT}`);
};

// Check if this file is the main module
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
    startServer();
}

export default app;
