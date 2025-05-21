import { z } from 'zod';
import prisma from '@/lib/client';
import { createTRPCRouter, publicProcedure } from '../init';
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
        .output(
            z.object({
                email: z.string(),
                username: z.string(),
            })
        )
        .query(async ({ ctx }) => {
            const user = await prisma.user.findUnique({
                where: {
                    id: ctx.userId,
                },
            });

            if (!user) {
                throw new Error('User not found');
            }

            return {
                email: user.email,
                username: user.username ?? '',
            };
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
});
