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
import { objectiveSchema, savedObjectiveSchema, updateObjectiveSchema } from "@/schemas/objective";

export const objectivesRouter = createTRPCRouter({
    createObjective: publicProcedure
        .meta({
            openapi: {
                method: 'POST',
                path: '/objectives',
                tags: ['objectives'],
                summary: 'Create a new objective',
            },
        })
        .input(
            objectiveSchema
        )
        .output(
            savedObjectiveSchema
        )
        .mutation(async ({ input, ctx }) => {

            const newObjective = await prisma.objective.create({
                data: {
                    currentValue: input.currentValue,
                    deadline: input.deadline,
                    description: input.description,
                    targetValue: input.targetValue,
                    title: input.title,
                    unit: input.unit,
                    status: 'active',
                    user: {
                        connect: {
                            id: ctx.userId,
                        },
                    },
                },
            });

            return newObjective;
        }),
    getObjectivesByUser: publicProcedure
        .meta({
            openapi: {
                method: 'GET',
                path: '/objectives/user',
                tags: ['objectives'],
                summary: 'Get all objectives by user',
            },
        })
        .input(
            z.object({
                // userId: z.number(),
            })
        )
        .output(
            z.array(savedObjectiveSchema)
        )
        .query(async ({ ctx }) => {
            const objectives = await prisma.objective.findMany({
                where: {
                    userId: ctx.userId,
                },
            });
            return objectives;
        }),
    updateObjective: publicProcedure
        .meta({
            openapi: {
                method: 'PATCH',
                path: '/objectives/{id}',
                tags: ['objectives'],
                summary: 'Update an objective',
            },
        })
        .input(
            z.object({
                id: z.number(),
                ...updateObjectiveSchema.shape
            })
        )
        .output(
            savedObjectiveSchema
        )
        .mutation(async ({ input, ctx }) => {
            const updatedObjective = await prisma.objective.update({
                where: {
                    id: input.id,
                },
                data: input,
            });
            return updatedObjective;
        }),
    deleteObjective: publicProcedure
        .meta({
            openapi: {
                method: 'DELETE',
                path: '/objectives/{id}',
                tags: ['objectives'],
                summary: 'Delete an objective',
            },
        })
        .input(
            z.object({
                id: z.number(),
            })
        )
        .output(
            z.string()
        )
        .mutation(async ({ input, ctx }) => {
            const deletedObjective = await prisma.objective.delete({
                where: {
                    id: input.id,
                },
            });
            return "Objective deleted successfully";
        })
});