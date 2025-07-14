import { z } from 'zod';
import prisma from '@/lib/client';
import { createTRPCRouter, publicProcedure } from '../init';
import { savedSessionSchema } from '@/schemas/session';

export const sessionRouter = createTRPCRouter({
    getSessionsByUserId: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/sessions/user/{id}',
                tags: ['sessions'],
                summary: 'Get all sessions by user',
            },
        })
        .input(
            z.object({
                userId: z.number(),
            })
        )
        .output(z.array(savedSessionSchema))
        .query(async ({ input }) => {
            const sessions = await prisma.session.findMany({
                where: {
                    userId: input.userId,
                },
            });

            return sessions;
        }),
    invalidateSession: publicProcedure
        .meta({
            openapi: {
                method: 'PATCH',
                path: '/sessions/invalidate/{id}',
                tags: ['sessions'],
                summary: 'Invalidate a session',
            },
        })
        .input(savedSessionSchema)
        .output(savedSessionSchema)
        .mutation(async ({ input }) => {
            const { id } = input;

            const updatedSession = await prisma.session.update({
                where: {
                    id: id,
                },
                data: {
                    status: 'invalidated',
                },
            });
            return updatedSession;
        }),
});
