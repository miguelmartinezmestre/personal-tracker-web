import { z } from 'zod';
import prisma from '@/lib/client';
import { createTRPCRouter, publicProcedure } from '../init';
import { updatePasswordSchema } from '@/schemas/update-password';
import { verifyPassword } from '@/server/crypto.service';
import { TRPCError } from '@trpc/server';
import { dashboardGraphsDataSchema } from '@/schemas/dashboard-graphs-data';
import { getDashboardObjectivesCounts, getUpdateProgressPerMonth, getObjectivesWithMostProgress } from '@prisma/client/sql';

export const userRouter = createTRPCRouter({
    getAccountDetails: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/user/account-details',
                tags: ['user'],
                summary: 'Get account details',
            },
        })
        .input(z.object({}))
        .output(
            z.object({
                email: z.string(),
                username: z.string(),
                role: z.string(),
            })
        )
        .query(async ({ ctx }) => {
            try {
                const user = await prisma.user.findFirst({
                    where: {
                        id: ctx.userId,
                    },
                });

                if (!user) {
                    return {
                        email: '',
                        username: '',
                        role: '',
                    };
                }

                return {
                    email: user.email,
                    username: user.username ?? '',
                    role: user.role,
                };
            } catch (error) {
                console.error(error);
                return {
                    email: '',
                    username: '',
                    role: '',
                };
            }
        }),

    updateAccountDetails: publicProcedure
        .meta({
            openapi: {
                method: 'PUT',
                path: '/user/account-details',
                tags: ['user'],
                summary: 'Update account details',
            },
        })
        .input(
            z.object({
                email: z.string(),
                username: z.string(),
            })
        )
        .output(
            z.object({
                message: z.string(),
                error: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updatedUser = await prisma.user.update({
                where: { id: ctx.userId },
                data: { email: input.email, username: input.username },
            });

            if (!updatedUser) {
                return {
                    message: 'Failed to update account details',
                    error: true,
                };
            }

            return {
                message: 'Account details updated',
                error: false,
            };
        }),
    updatePassword: publicProcedure
        .meta({
            openapi: {
                method: 'PUT',
                path: '/user/password',
                tags: ['user'],
                summary: 'Update password',
            },
        })
        .input(updatePasswordSchema)
        .output(z.object({ message: z.string(), error: z.boolean() }))
        .mutation(async ({ ctx, input }) => {

            const user = await prisma.user.findFirst({
                where: { id: ctx.userId },
            });

            if (!user) {
                return {
                    message: 'User not found',
                    error: true,
                };
            }

            const isPasswordCorrect = await verifyPassword(input.password, user.password);

            if (!isPasswordCorrect) {
                return {
                    message: 'Incorrect password',
                    error: true,
                };
            }

            const updatedUser = await prisma.user.update({
                where: { id: ctx.userId },
                data: { password: input.newPassword },
            });

            if (!updatedUser) {
                return {
                    message: 'Failed to update password',
                    error: true,
                };
            }

            return {
                message: 'Password updated',
                error: false,
            };
        }),
    getDashboardGraphsData: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/user/dashboard-graphs-data',
                tags: ['user'],
                summary: 'Get dashboard graphs data',
            },
        })
        .input(z.object({}))
        .output(dashboardGraphsDataSchema)
        .query(async ({ ctx }) => {

            const mostRecentObjectivesDeadlines = await prisma.objective.findMany({
                where: {
                    userId: ctx.userId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 5,
            });

            const objectiveCountsResult = await prisma.$queryRawTyped(getDashboardObjectivesCounts(ctx.userId));
            const objectiveCounts = objectiveCountsResult[0];

            const progressAddedPerMonthResult = await prisma.$queryRawTyped(getUpdateProgressPerMonth(ctx.userId));

            const objectivesWithMostProgressResult = await prisma.$queryRawTyped(getObjectivesWithMostProgress(ctx.userId));

            // console.log(objectiveCountsResult)

            return {
                mostRecentObjectivesDeadlines: mostRecentObjectivesDeadlines.map((obj, index) => {
                    const daysToDeadline = obj.deadline ? Math.ceil((obj.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const colors = ['var(--color-chrome)', 'var(--color-safari)', 'var(--color-firefox)', 'var(--color-edge)', 'var(--color-other)'];
                    return {
                        objective: obj.title,
                        days: daysToDeadline,
                        fill: colors[index % colors.length],
                    };
                }),
                totalObjectives: Number(objectiveCounts.total_objectives),
                pendingObjectives: Number(objectiveCounts.pending_objectives),
                completedObjectives: Number(objectiveCounts.completed_objectives),
                progressAddedPerMonth: progressAddedPerMonthResult.map(item => ({
                    month: item.month || '',
                    count: Number(item.progress),
                })),
                objectivesWithMostProgress: objectivesWithMostProgressResult.map(item => ({
                    objective: item.title,
                    progress: Number(item.progress),
                })),
            };

        }),
});
