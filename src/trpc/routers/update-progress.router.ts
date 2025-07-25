// import { z } from 'zod';
// import prisma from '@/lib/client';
// import { createTRPCRouter, publicProcedure } from '../init';
// import { savedUpdateProgressSchema } from '@/schemas/update-progress';
// import { updateProgressSchema } from '@/schemas/update-progress';

// export const updateProgressRouter = createTRPCRouter({
//     createUpdateProgress: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'POST',
//                 path: '/update-progress',
//                 tags: ['update-progress'],
//                 summary: 'Create an update progress',
//             },
//         })
//         .input(updateProgressSchema)
//         .output(savedUpdateProgressSchema)
//         .mutation(async ({ input }) => {
//             const newUpdateProgress = await prisma.progressUpdate.create({
//                 data: {
//                     updatedValue: input.updatedValue,
//                     updateDate: input.updateDate,
//                     comment: input.comment,
//                     objective: {
//                         connect: {
//                             id: input.objectiveId,
//                         },
//                     },
//                 },
//             });

//             return newUpdateProgress;
//         }),
//     getUpdateProgressByObjectiveId: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/update-progress/objective/{id}',
//                 tags: ['update-progress'],
//                 summary: 'Get all update progress by objective',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(z.array(savedUpdateProgressSchema))
//         .query(async ({ input }) => {
//             try {
//                 const updateProgress = await prisma.progressUpdate.findMany({
//                     where: {
//                         objectiveId: input.id,
//                     },
//                 });
    
//                 return updateProgress;
//             } catch (error) {
//                 console.error(error);
//                 return [];
//             }
//         }),
//     updateUpdateProgress: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'PATCH',
//                 path: '/update-progress/{id}',
//                 tags: ['update-progress'],
//                 summary: 'Update an update progress',
//             },
//         })
//         .input(savedUpdateProgressSchema)
//         .output(savedUpdateProgressSchema)
//         .mutation(async ({ input }) => {
//             const { id, ...rest } = input;

//             const updatedUpdateProgress = await prisma.progressUpdate.update({
//                 where: {
//                     id: id,
//                 },
//                 data: {
//                     updatedValue: rest.updatedValue,
//                     updateDate: rest.updateDate,
//                     comment: rest.comment,
//                 },
//             });
//             return updatedUpdateProgress;
//         }),
//     deleteUpdateProgress: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'DELETE',
//                 path: '/update-progress/{id}',
//                 tags: ['update-progress'],
//                 summary: 'Delete an update progress',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(z.string())
//         .mutation(async ({ input }) => {
//             console.log(input.id);

//             await prisma.progressUpdate.delete({
//                 where: {
//                     id: input.id,
//                 },
//             });
//             return 'Update progress deleted successfully';
//         }),
// });
