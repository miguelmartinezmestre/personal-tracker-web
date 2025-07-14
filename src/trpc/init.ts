import { TRPCError, initTRPC } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { OpenApiMeta } from 'trpc-to-openapi';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import prisma from '@/lib/client';
import { cache } from 'react';

export const jwtSecret = randomUUID();

export type Context = {
    userId: number;
};

export const createContext = cache(async ({
    // req,
    // resHeaders,
}: FetchCreateContextFnOptions): Promise<Context> => {
    // const isTrpcRequest = req.url?.includes("/api/trpc")

    // const headersList = await headers();
    // const requestId = randomUUID();
    // headersList.set('x-request-id', requestId);
    // set CORS
    // headersList.set('access-control-allow-origin', '*');
    // headersList.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // headersList.set('access-control-allow-headers', 'Content-Type, Authorization');

    const cookieStore = await cookies();

    const session = cookieStore.get('session_id');

    // console.log("session", session)

    // if (!session) {
    //   console.log("session error", session)
    //   throw new TRPCError({
    //     message: 'Unauthorized',
    //     code: 'UNAUTHORIZED',
    //   });
    // }

    const sessionFound = await prisma.session.findFirst({
        where: {
            value: session?.value,
        },
        include: {
            user: true,
        },
    });

    // console.log("sessionFound", sessionFound)

    if (!sessionFound) {
        throw new TRPCError({
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
        });
    }

    return { userId: sessionFound.user.id };
})

export const t = initTRPC
    .context<Context>()
    .meta<OpenApiMeta>()
    .create({
        transformer: superjson,
        // errorFormatter: ({ error, shape }) => {
        //   if (error.code === 'INTERNAL_SERVER_ERROR' && process.env.NODE_ENV === 'production') {
        //     return { ...shape, message: 'Internal server error' };
        //   }
        //   // console.log("shape", shape)
        //   return shape;
        // },

        errorFormatter: ({ error, shape }) => {
            if (error.code === 'INTERNAL_SERVER_ERROR' && process.env.NODE_ENV === 'production') {
                return { ...shape, message: 'Internal server error' };
            }
            console.log('error', error);
            console.log('shape', shape);
            return shape;
        },

        // errorFormatter({ shape, error }) {
        //   return {
        //     message: error.message,
        //   };
        // },
    });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
// export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
//   if (!ctx.user) {
//     throw new TRPCError({
//       message: 'User not found',
//       code: 'UNAUTHORIZED',
//     });
//   }
//   return next({ ctx: { ...ctx, user: ctx.user } });
// });

// Move appRouter definition to a separate file
