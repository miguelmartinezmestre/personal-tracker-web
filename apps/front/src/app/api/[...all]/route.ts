import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { handle } from 'hono/vercel';
import { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const app = new OpenAPIHono().basePath('/api');

// Protect all API routes (including Swagger UI) with Better Auth session cookie presence.
// Note: This is an optimistic cookie-only check; real authorization must still be enforced in backend routes.
app.use('*', async (c, next) => {
    const sessionCookie = getSessionCookie(new NextRequest(c.req.raw));
    if (!sessionCookie) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});

const getUserRoute = createRoute({
    method: 'get',
    path: '/users/{id}',
    request: {
        params: z.object({
            id: z
                .string()
                .min(3)
                .openapi({
                    param: {
                        name: 'id',
                        in: 'path',
                    },
                    example: '1212121',
                }),
        }),
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z
                        .object({
                            id: z.string().openapi({
                                example: '123',
                            }),
                            name: z.string().openapi({
                                example: 'John Doe',
                            }),
                            age: z.number().openapi({
                                example: 42,
                            }),
                        })
                        .openapi('User'),
                },
            },
            description: 'Retrieve the user',
        },
    },
});

// Workaround: current @hono/zod-openapi types sometimes infer `never` for the handler return
// when used through the Next.js/Vercel adapter, even though runtime behavior is correct.
app.openapi(getUserRoute, (async c => {
    const { id } = c.req.valid('param');
    return c.json(
        {
            id,
            age: 20,
            name: 'Ultra-man',
        },
        200
    );
}) as any);

app.doc('/doc', {
    openapi: '3.0.0',
    info: {
        version: '1.0.0',
        title: 'My API',
    },
});

app.get('/ui', swaggerUI({ url: '/api/doc' }));

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
export const HEAD = handle(app);
