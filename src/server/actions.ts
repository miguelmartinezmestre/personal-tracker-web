"use server"
import prisma from "@/lib/client";
import { actionClient } from "@/lib/safe-action";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation"
import { z } from "zod";
import { generateSessionId, hashPassword, verifyPassword } from "./crypto.service";
import { loginSchema } from "@/schemas/login";
import { registerSchema } from "@/schemas/register";


export async function redirectToUrl(url: string) {
    redirect(url);
}

export const logoutAction = actionClient
    .action(async () => {
        const cookieStore = await cookies();
        cookieStore.delete('session_id');
        redirect('/');
    });



export const loginAction = actionClient
    .schema(loginSchema)
    .outputSchema(z.object({
        message: z.string(),
        error: z.boolean()
    }))
    .action(async ({ parsedInput: { email, password } }) => {

        const headersList = await headers();

        const userAgent = headersList.get("user-agent");

        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });

        if (!user) {
            return {
                message: "Incorrect credentials1",
                error: true
            }
        }

        const isPasswordCorrect = await verifyPassword(
            password,
            user.password,
        );

        if (!isPasswordCorrect) {
            return {
                message: "Incorrect credentials2",
                error: true
            }
        }

        const sessionId = await generateSessionId();

        await prisma.session.create({
            data: {
                userId: user.id,
                value: sessionId,
                userAgent: String(userAgent),
                status: 'active',
            }
        });

        const cookieStore = await cookies();

        cookieStore.set('session_id', sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        redirect("/dashboard");
    });

export const registerAction = actionClient
    .schema(registerSchema)
    .outputSchema(z.object({
        message: z.string(),
        error: z.boolean()
    }))
    .action(async ({ parsedInput: { username, password, email } }) => {
        const userFound = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (userFound) {
            return {
                message: "Unexpected error",
                error: true
            }
        }

        const passwordHashed = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                username: username,
                password: passwordHashed,
                email: email
            }
        });

        const headersList = await headers();

        const userAgent = headersList.get("user-agent");

        const sessionId = await generateSessionId();

        await prisma.session.create({
            data: {
                userId: user.id,
                value: sessionId,
                userAgent: String(userAgent),
                status: 'active',
            }
        });

        const cookieStore = await cookies();

        cookieStore.set('session_id', sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        redirect("/dashboard");
    });

