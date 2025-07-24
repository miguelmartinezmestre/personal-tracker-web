// import { z } from 'zod';
// import prisma from '@/lib/client';
// import { objectiveSchema, savedObjectiveSchema } from '@/schemas/objective';
// import { createTRPCRouter, publicProcedure } from '../init';

// export const objectivesRouter = createTRPCRouter({
//     createObjective: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'POST',
//                 path: '/objectives',
//                 tags: ['objectives'],
//                 summary: 'Create a new objective',
//             },
//         })
//         .input(objectiveSchema)
//         .output(savedObjectiveSchema)
//         .mutation(async ({ input, ctx }) => {
//             const newObjective = await prisma.objective.create({
//                 data: {
//                     currentValue: input.currentValue,
//                     deadline: input.deadline,
//                     description: input.description,
//                     targetValue: input.targetValue,
//                     title: input.title,
//                     unit: input.unit,
//                     status: 'active',
//                     user: {
//                         connect: {
//                             id: ctx.userId,
//                         },
//                     },
//                 },
//             });

//             return newObjective;
//         }),
//     getObjectivesByUser: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/objectives/user',
//                 tags: ['objectives'],
//                 summary: 'Get all objectives by user',
//             },
//         })
//         .input(
//             z.object({
//                 // userId: z.number(),
//             })
//         )
//         .output(z.array(savedObjectiveSchema))
//         .query(async ({ ctx }) => {
//             const objectives = await prisma.objective.findMany({
//                 where: {
//                     userId: ctx.userId,
//                 },
//             });

//             return objectives;
//         }),
//     getObjectiveById: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/objectives/{id}',
//                 tags: ['objectives'],
//                 summary: 'Get all objectives by user',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(savedObjectiveSchema)
//         .query(async ({ input }) => {
//             const objective = await prisma.objective.findFirst({
//                 where: {
//                     id: input.id,
//                 },
//             });

//             if (!objective) {
//                 return {
//                     title: '',
//                     description: '',
//                     targetValue: 0,
//                     currentValue: 0,
//                     deadline: null,
//                     unit: '',
//                     createdAt: new Date(),
//                     updatedAt: new Date(),
//                     id: input.id,
//                     categoryId: null,
//                 };
//             }

//             return objective;
//         }),
//     updateObjective: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'PATCH',
//                 path: '/objectives/{id}',
//                 tags: ['objectives'],
//                 summary: 'Update an objective',
//             },
//         })
//         .input(savedObjectiveSchema)
//         .output(savedObjectiveSchema)
//         .mutation(async ({ input }) => {
//             const { id, ...rest } = input;

//             const updatedObjective = await prisma.objective.update({
//                 where: {
//                     id: id,
//                 },
//                 data: {
//                     title: rest.title,
//                     description: rest.description,
//                     category: rest.category,
//                     targetValue: rest.targetValue,
//                     currentValue: rest.currentValue,
//                     deadline: rest.deadline,
//                     unit: rest.unit,
//                 },
//             });
//             return updatedObjective;
//         }),
//     deleteObjective: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'DELETE',
//                 path: '/objectives/{id}',
//                 tags: ['objectives'],
//                 summary: 'Delete an objective',
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

//             await prisma.objective.delete({
//                 where: {
//                     id: input.id,
//                 },
//             });
//             return 'Objective deleted successfully';
//         }),
// });
