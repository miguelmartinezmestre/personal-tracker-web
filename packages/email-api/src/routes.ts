import { z } from 'zod';
import { Hono } from 'hono';
import type { Env } from './index';
import { sendEmail, verifyConnection } from './mailer';
import { sendWelcomeEmail, sendPasswordResetEmail, sendDeadlineReminderEmail } from './templates';
import { isEmailConfigured } from './config';

const app = new Hono<{ Bindings: Env }>();

// Schema validation
const sendEmailSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    text: z.string().optional(),
    html: z.string().optional(),
});

const welcomeEmailSchema = z.object({
    to: z.string().email(),
    username: z.string(),
});

const passwordResetEmailSchema = z.object({
    to: z.string().email(),
    username: z.string(),
    resetUrl: z.string().url(),
});

const deadlineReminderEmailSchema = z.object({
    to: z.string().email(),
    username: z.string(),
    objectiveTitle: z.string(),
    deadline: z.number(),
    daysRemaining: z.number(),
});

// Health check endpoint
app.get('/health', c => {
    return c.json({ status: 'ok', configured: isEmailConfigured() });
});

// Verify SMTP connection
app.get('/verify', async c => {
    const verified = await verifyConnection();
    return c.json({ configured: isEmailConfigured(), verified });
});

// Send generic email
app.post('/send', async c => {
    const body = await c.req.json();
    const result = sendEmailSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const emailResult = await sendEmail(result.data);
    const status = emailResult.success ? 200 : 500;
    return c.json(emailResult, status);
});

// Send welcome email
app.post('/welcome', async c => {
    const body = await c.req.json();
    const result = welcomeEmailSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const emailResult = await sendWelcomeEmail(result.data);
    const status = emailResult.success ? 200 : 500;
    return c.json(emailResult, status);
});

// Send password reset email
app.post('/password-reset', async c => {
    const body = await c.req.json();
    const result = passwordResetEmailSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const emailResult = await sendPasswordResetEmail(result.data);
    const status = emailResult.success ? 200 : 500;
    return c.json(emailResult, status);
});

// Send deadline reminder email
app.post('/deadline-reminder', async c => {
    const body = await c.req.json();
    const result = deadlineReminderEmailSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Invalid request', details: result.error.flatten() }, 400);
    }

    const emailResult = await sendDeadlineReminderEmail(result.data);
    const status = emailResult.success ? 200 : 500;
    return c.json(emailResult, status);
});

export default app;
