import { z } from "zod";
import { createTRPCRouter, publicProcedure, jwtSecret } from "./init";
import { database } from "./database";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken';
import { redirect } from "next/navigation";
import { RedirectError } from "./redirect-error";
import { cookies } from "next/headers";
import prisma from "@/lib/client";
import { generateSessionId, hashPassword, verifyPassword } from "./crypto.service";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/register',
        tags: ['auth'],
        summary: 'Register as a new user',
      },
    })
    .input(
      z.object({
        email: z.string().email({
          message: 'Por favor ingresa un correo electrónico válido.',
        }),
        password: z.string().min(8, {
          message: 'La contraseña debe tener al menos 8 caracteres.',
        }),
        confirmPassword: z.string().min(8, {
          message: 'La contraseña debe tener al menos 8 caracteres.',
        }),
        username: z.string().min(3, {
          message: 'El nombre de usuario debe tener al menos 3 caracteres.',
        }),
      })

    )
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          username: z.string(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      let user = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (user) {
        throw new TRPCError({
          message: 'Operation failed',
          code: 'UNAUTHORIZED',
        });
      }

      const hashedPassword = await hashPassword(input.password);

      const newUser = await prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          username: input.username,
        },
      });

      return { user: { id: String(newUser.id), email: newUser.email, username: newUser.username ?? "" } };
    }),
  login: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/login',
        tags: ['auth'],
        summary: 'Login as an existing user',
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    // .output(
    //   z.null()
    // )
    .mutation(async ({ input }) => {

      const user = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      const isPasswordCorrect = await verifyPassword(input.password, user?.password || '');

      if (!user || !isPasswordCorrect) {
        throw new TRPCError({
          message: 'Email or password incorrect',
          code: 'UNAUTHORIZED',
        });
      }

      const cookieStore = await cookies();

      const sessionId = await generateSessionId();

      await prisma.session.create({
        data: {
          userId: user.id,
          value: sessionId,
          status: 'active',
          userAgent: '',
        },
      });

      cookieStore.set('token', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      // redirect('/dashboard');

      // throw new RedirectError('/dashboard')

      // return {
      //   token: jwt.sign(user.id, jwtSecret),
      // };
    }),
});