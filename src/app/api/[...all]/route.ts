import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { handle } from 'hono/vercel'

const app = new OpenAPIHono().basePath('/api')

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
})

app.openapi(createRoute({
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
}), (c) => {
  const { id } = c.req.valid('param')
  return c.json({
    id,
    age: 20,
    name: 'Ultra-man',
  })
})

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API',
  },
})

app.get('/ui', swaggerUI({ url: '/api/doc' }))


export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)
export const HEAD = handle(app)