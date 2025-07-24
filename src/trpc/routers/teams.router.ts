// import { z } from 'zod';
// import prisma from '@/lib/client';
// import { teamSchema, savedTeamSchema } from '@/schemas/team';
// import { createTRPCRouter, publicProcedure } from '../init';

// export const teamsRouter = createTRPCRouter({
//     createTeam: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'POST',
//                 path: '/teams',
//                 tags: ['teams'],
//                 summary: 'Create a new team',
//             },
//         })
//         .input(teamSchema)
//         .output(savedTeamSchema)
//         .mutation(async ({ input }) => {
//             const newTeam = await prisma.team.create({
//                 data: {
//                     name: input.name,
//                     description: input.description,
//                 },
//             });

//             return newTeam;
//         }),
//     getTeams: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/teams',
//                 tags: ['teams'],
//                 summary: 'Get all teams',
//             },
//         })
//         .input(
//             z.object({
//                 // userId: z.number(),
//             })
//         )
//         .output(z.array(savedTeamSchema))
//         .query(async () => {
//             const teams = await prisma.team.findMany();

//             return teams;
//         }),
//     getTeamById: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'GET',
//                 path: '/teams/{id}',
//                 tags: ['teams'],
//                 summary: 'Get a team by id',
//             },
//         })
//         .input(
//             z.object({
//                 id: z.number(),
//             })
//         )
//         .output(savedTeamSchema)
//         .query(async ({ input }) => {
//             const team = await prisma.team.findFirst({
//                 where: {
//                     id: input.id,
//                 },
//             });

//             if (!team) {
//                 return {
//                     name: '',
//                     description: '',
//                     id: input.id,
//                 };
//             }

//             return team;
//         }),
//     updateTeam: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'PATCH',
//                 path: '/teams/{id}',
//                 tags: ['teams'],
//                 summary: 'Update a team',
//             },
//         })
//         .input(savedTeamSchema)
//         .output(savedTeamSchema)
//         .mutation(async ({ input }) => {
//             const { id, ...rest } = input;

//             const updatedTeam = await prisma.team.update({
//                 where: {
//                     id: id,
//                 },
//                 data: {
//                     name: rest.name,
//                     description: rest.description,
//                 },
//             });
//             return updatedTeam;
//         }),
//     deleteTeam: publicProcedure
//         .meta({
//             openapi: {
//                 method: 'DELETE',
//                 path: '/teams/{id}',
//                 tags: ['teams'],
//                 summary: 'Delete a team',
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

//             await prisma.team.delete({
//                 where: {
//                     id: input.id,
//                 },
//             });
//             return 'Team deleted successfully';
//         }),
// });
