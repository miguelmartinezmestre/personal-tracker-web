import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { Context } from '../trpc.module';

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Simulamos acceso a base de datos
      return {
        id: input.id,
        name: 'Juan Pérez',
      };
    }),

  createUser: t.procedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Simulamos la creación del usuario
      const newUser = {
        id: Date.now().toString(),
        name: input.name,
      };
      return newUser;
    }),
  login: t.procedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await ctx.usersService.login(
          { email: input.email, password: input.password },
          ctx.req,
          ctx.res,
        );

        ctx.res.cookie('session_id', response.sessionId, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          // maxAge: 1000 * 60 * 60 * 24 * 30,
          // domain: 'localhost',
          // expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          // signed: false,
        });
        ctx.res.json({
          success: true,
        });
        ctx.res.end();

        // return {
        //   success: true,
        // }
      } catch (error) {
        console.error(error);
        ctx.res.status(500).json({
          success: false,
          message: 'Error al iniciar sesión',
        });
        ctx.res.end();
      }
    }),
});

export type AppRouter = typeof appRouter;
