// import { z } from 'zod';
// import prisma from '@/lib/client';
// import { createTRPCRouter, publicProcedure } from '../init';
// import { savedNotificationSchema } from '@/schemas/notification';

// export const notificationRouter = createTRPCRouter({
//     getNotificationsByUserId: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/notifications/user/{id}',
//                 tags: ['notifications'],
//                 summary: 'Get all notifications by user',
//             },
//         })
//         .input(
//             z.object({
//                 userId: z.number(),
//             })
//         )
//         .output(z.array(savedNotificationSchema))
//         .query(async ({ input }) => {
//             const notifications = await prisma.notification.findMany({
//                 where: {
//                     userId: input.userId,
//                 },
//             });

//             return notifications;
//         }),
//     markNotificationAsRead: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'PATCH',
//                 path: '/notifications/mark-as-read/{id}',
//                 tags: ['notifications'],
//                 summary: 'Mark a notification as read',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(savedNotificationSchema)
//         .mutation(async ({ input }) => {
//             const { id } = input;

//             const updatedNotification = await prisma.notification.update({
//                 where: {
//                     id: id,
//                 },
//                 data: {
//                     read: true,
//                 },
//             });
//             return updatedNotification;
//         }),
// });
