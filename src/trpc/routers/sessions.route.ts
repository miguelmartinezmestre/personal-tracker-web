// import { z } from 'zod';
// import prisma from '@/lib/client';
// import { createTRPCRouter, publicProcedure } from '../init';
// import { savedSessionSchema } from '@/schemas/session';

// export const sessionsRouter = createTRPCRouter({
//     getSessionsByUser: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/sessions/user',
//                 tags: ['sessions'],
//                 summary: 'Get all sessions by user',
//             },
//         })
//         .input(
//             z.object({
//                 // userId: z.number(),
//             })
//         )
//         .output(z.array(savedSessionSchema))
//         .query(async ({ ctx }) => {
//             const sessions = await prisma.session.findMany({
//                 where: {
//                     userId: ctx.userId,
//                 },
//             });

//             return sessions;
//         }),
//     invalidateSession: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'DELETE',
//                 path: '/sessions/{id}',
//                 tags: ['sessions'],
//                 summary: 'Delete a session',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(z.string())
//         .mutation(async ({ input }) => {

//             await prisma.session.update({
//                 where: {
//                     id: input.id,
//                 },
//                 data: {
//                     status: 'inactive',
//                 },
//             });

//             return 'Session updatedsuccessfully';
//         }),
// });
