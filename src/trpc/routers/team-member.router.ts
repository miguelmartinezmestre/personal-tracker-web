import { z } from 'zod';
import prisma from '@/lib/client';
import { createTRPCRouter, publicProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { teamMemberSchema, savedTeamMemberSchema } from '@/schemas/team-member';
import { randomBytes } from 'crypto';
import { Role, TeamRole } from '@prisma/client';
import { generateResetPasswordKey } from '@/server/crypto.service';
import { sendRecoverPasswordEmail } from '@/lib/email';

export const teamMembersRouter = createTRPCRouter({
    createTeamMember: publicProcedure
        .meta({
            openapi: {
                method: 'POST',
                path: '/team-members',
                tags: ['team-members'],
                summary: 'Create a new team member',
            },
        })
        .input(teamMemberSchema)
        .output(savedTeamMemberSchema)
        .mutation(async ({ input, ctx }) => {

            if (!input.email) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Email is required',
                });
            }


            const userFound = await prisma.user.findUnique({
                where: {
                    email: input.email,
                },
            });

            if (userFound) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User already exists',
                });
            }

            const user = await prisma.user.create({
                data: {
                    email: input.email,
                    password: randomBytes(32).toString('hex'),
                    role: Role.USER,
                },
            });

            const newTeamMember = await prisma.teamMember.create({
                data: {
                    userId: user.id,
                    teamId: input.teamId,
                    role: input.role as TeamRole,
                }
            });
            
            const resetPasswordKey = await generateResetPasswordKey();

            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    resetPasswordKey: resetPasswordKey,
                },
            });

            sendRecoverPasswordEmail(user.username ?? '', user.email, process.env.APP_URL + '/reset-password?key=' + resetPasswordKey);

            return { ...newTeamMember, email: user.email };
        }),
    getTeamMembersByTeamId: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/team-members',
                tags: ['team-members'],
                summary: 'Get all team members',
            },
        })
        .input(
            z.object({
                teamId: z.number(),
            })
        )
        .output(z.array(savedTeamMemberSchema))
        .query(async ({ input }) => {


            // user is manager of the team

            const teamMembers = await prisma.teamMember.findMany({
                where: {
                    teamId: input.teamId,
                },
                include: {
                    user: true,
                },
            });

            return teamMembers.map(member => ({
                ...member,
                email: member.user.email,
            }));
        }),
    updateTeamMember: publicProcedure
        .meta({
            openapi: {
                method: 'PATCH',
                path: '/team-members/{id}',
                tags: ['team-members'],
                summary: 'Update a team member',
            },
        })
        .input(savedTeamMemberSchema)
        .output(savedTeamMemberSchema)
        .mutation(async ({ input, ctx }) => {
            const { id, ...rest } = input;

            const updatedTeamMember = await prisma.teamMember.update({
                where: {
                    id: id,
                },
                data: {
                    role: rest.role as TeamRole,
                },
                include: {
                    user: true,
                },
            });

            return { ...updatedTeamMember, email: updatedTeamMember.user.email };
        }),
    deleteTeamMember: publicProcedure
        .meta({
            openapi: {
                method: 'DELETE',
                path: '/team-members/{id}',
                tags: ['team-members'],
                summary: 'Delete a team member',
            },
        })
        .input(
            z.object({
                id: z.number(),
            })
        )
        .output(z.string())
        .mutation(async ({ input }) => {
            console.log(input.id);

            await prisma.teamMember.delete({
                where: {
                    id: input.id,
                },
            });

            await prisma.user.delete({
                where: {
                    id: input.id,
                },
            });

            return 'Team member deleted successfully';
        }),
});
