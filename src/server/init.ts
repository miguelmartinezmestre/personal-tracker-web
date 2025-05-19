import { TRPCError, initTRPC } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import jwt from 'jsonwebtoken';
import { OpenApiMeta } from 'trpc-to-openapi';
import { randomUUID } from 'node:crypto';

import { User, database } from './database';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/client';

export const jwtSecret = randomUUID();

export type Context = {
  userId: number;
  requestId: string;
}

export const createContext = async ({
  req,
  resHeaders,
}:
  FetchCreateContextFnOptions): Promise<Context> => {

  // const isTrpcRequest = req.url?.includes("/api/trpc")

  const headersList = await headers();
  const requestId = randomUUID();
  // headersList.set('x-request-id', requestId);
  // set CORS
  // headersList.set('access-control-allow-origin', '*');
  // headersList.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // headersList.set('access-control-allow-headers', 'Content-Type, Authorization');

  let user: User | null = null;

  // const cookieStore = await cookies();

  // const token = cookieStore.get('token')

  // try {
  //   const authHeader = req.headers.get('authorization');
  //   if (authHeader) {
  //     const token = authHeader.split(' ')[1];
  //     const userId = jwt.verify(token, jwtSecret) as string;
  //     if (userId) {
  //       user = database.users.find((_user) => _user.id === userId) ?? null;
  //     }
  //   }
  // } catch (cause) {
  //   console.error(cause);
  // }

  const cookieStore = await cookies();

  const token = cookieStore.get('session_id');

  if (!token) {
    throw new TRPCError({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
  }

  const session = await prisma.session.findFirst({
    where: {
      value: token.value,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new TRPCError({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
  }

  return { userId: session.user.id, requestId };
};

export const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create({
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
      return shape;
    },

    // errorFormatter({ shape, error }) {
    //   return {
    //     message: error.message,
    //   };
    // },
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // if (!ctx.user) {
  //   throw new TRPCError({
  //     message: 'User not found',
  //     code: 'UNAUTHORIZED',
  //   });
  // }
  // return next({ ctx: { ...ctx, user: ctx.user } });
});



// Move appRouter definition to a separate file

