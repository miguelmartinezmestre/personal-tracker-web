// import prisma from '@/lib/client';
// import { TRPCError } from '@trpc/server';
// import { cookies } from 'next/headers';

// export async function getUserId() {
//     const cookieStore = await cookies();

//     const session = cookieStore.get('session_id');

//     const sessionFound = await prisma.session.findFirst({
//         where: {
//             value: session?.value,
//             status: 'active',
//         },
//         include: {
//             user: true,
//         },
//     });

//     if (!sessionFound) {
//         throw new TRPCError({
//             code: 'UNAUTHORIZED',
//             message: 'Unauthorized',
//         });
//     }

//     return sessionFound.user.id;
// }
