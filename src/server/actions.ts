// 'use server';
// import prisma from '@/lib/client';
// import { actionClient } from '@/lib/safe-action';
// import { cookies, headers } from 'next/headers';
// import { redirect } from 'next/navigation';
// import { z } from 'zod';
// import { generateResetPasswordKey, generateSessionId, hashPassword, verifyPassword } from '@/server/crypto.service';
// import { loginSchema } from '@/schemas/login';
// import { registerSchema } from '@/schemas/register';
// import { resetPasswordSchema } from '@/schemas/reset-password';
// import { forgetPasswordSchema } from '@/schemas/forget-password';
// import { sendRecoverPasswordEmail } from '@/lib/email';

// export const logoutAction = actionClient.action(async () => {
//     const cookieStore = await cookies();
//     cookieStore.delete('session_id');
//     redirect('/');
// });

// export const loginAction = actionClient
//     .schema(loginSchema)
//     .outputSchema(
//         z.object({
//             message: z.string(),
//             error: z.boolean(),
//         })
//     )
//     .action(async ({ parsedInput: { email, password } }) => {
//         const headersList = await headers();

//         const userAgent = headersList.get('user-agent');

//         const user = await prisma.user.findFirst({
//             where: {
//                 email: email,
//             },
//         });

//         if (!user) {
//             return {
//                 message: 'Incorrect credentials1',
//                 error: true,
//             };
//         }

//         const isPasswordCorrect = await verifyPassword(password, user.password);

//         if (!isPasswordCorrect) {
//             return {
//                 message: 'Incorrect credentials2',
//                 error: true,
//             };
//         }

//         const sessionId = await generateSessionId();

//         await prisma.session.create({
//             data: {
//                 userId: user.id,
//                 value: sessionId,
//                 userAgent: String(userAgent),
//                 status: 'active',
//             },
//         });

//         const cookieStore = await cookies();

//         cookieStore.set('session_id', sessionId, {
//             httpOnly: true,
//             secure: false,
//             sameSite: 'lax',
//         });

//         redirect('/dashboard/home');
//     });

// export const registerAction = actionClient
//     .schema(registerSchema)
//     .outputSchema(
//         z.object({
//             message: z.string(),
//             error: z.boolean(),
//         })
//     )
//     .action(async ({ parsedInput: { username, password, email } }) => {
//         const userFound = await prisma.user.findFirst({
//             where: {
//                 email: email,
//             },
//         });
//         if (userFound) {
//             return {
//                 message: 'Unexpected error',
//                 error: true,
//             };
//         }

//         const passwordHashed = await hashPassword(password);

//         const user = await prisma.user.create({
//             data: {
//                 username: username,
//                 password: passwordHashed,
//                 email: email,
//             },
//         });

//         const headersList = await headers();

//         const userAgent = headersList.get('user-agent');

//         const sessionId = await generateSessionId();

//         await prisma.session.create({
//             data: {
//                 userId: user.id,
//                 value: sessionId,
//                 userAgent: String(userAgent),
//                 status: 'active',
//             },
//         });

//         const cookieStore = await cookies();

//         cookieStore.set('session_id', sessionId, {
//             httpOnly: true,
//             secure: false,
//             sameSite: 'lax',
//         });

//         redirect('/dashboard/home');
//     });

// export const isLoggedInAction = actionClient
//     .outputSchema(z.boolean())
//     .action(async () => {
//         const cookieStore = await cookies();
//         const sessionId = cookieStore.get('session_id');
//         if (!sessionId) {
//             return false;
//         }
//         const session = await prisma.session.findFirst({
//             where: {
//                 value: sessionId.value,
//             },
//         });
//         return !!session;
//     });

// export const resetPasswordAction = actionClient
//     .schema(resetPasswordSchema)
//     .outputSchema(
//         z.object({
//             message: z.string(),
//             error: z.boolean(),
//         })
//     )
//     .action(async ({ parsedInput: { password, resetPasswordKey } }) => {
//         const userFound = await prisma.user.findFirst({
//             where: {
//                 resetPasswordKey: resetPasswordKey,
//             },
//         });
//         if (!userFound) {
//             return {
//                 message: 'Unexpected error',
//                 error: true,
//             };
//         }

//         const passwordHashed = await hashPassword(password);

//         const user = await prisma.user.update({
//             where: {
//                 id: userFound.id,
//             },
//             data: {
//                 password: passwordHashed,
//                 resetPasswordKey: null,
//             },
//         });

//         const headersList = await headers();

//         const userAgent = headersList.get('user-agent');

//         const sessionId = await generateSessionId();

//         await prisma.session.create({
//             data: {
//                 userId: user.id,
//                 value: sessionId,
//                 userAgent: String(userAgent),
//                 status: 'active',
//             },
//         });

//         const cookieStore = await cookies();

//         cookieStore.set('session_id', sessionId, {
//             httpOnly: true,
//             secure: false,
//             sameSite: 'lax',
//         });

//         redirect('/dashboard/home');
//     });

// export const forgetPasswordAction = actionClient
//     .schema(forgetPasswordSchema)
//     .outputSchema(
//         z.object({
//             message: z.string(),
//             error: z.boolean(),
//         })
//     )
//     .action(async ({ parsedInput: { email } }) => {
//         const userFound = await prisma.user.findFirst({
//             where: {
//                 email: email,
//             },
//         });
//         if (!userFound) {
//             return {
//                 message: 'Unexpected error',
//                 error: true,
//             };
//         }

//         const resetPasswordKey = await generateResetPasswordKey();

//         await prisma.user.update({
//             where: {
//                 id: userFound.id,
//             },
//             data: {
//                 resetPasswordKey: resetPasswordKey,
//             },
//         });

//         sendRecoverPasswordEmail(userFound.username ?? '', userFound.email, process.env.APP_URL + '/reset-password?key=' + resetPasswordKey);

//         return {
//             message: 'Recovery email sent successfully',
//             error: false,
//         };
//     });