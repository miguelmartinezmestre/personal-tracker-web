// import prisma from "@/lib/client";
// import { cookies } from "next/headers";

// export async function isLoggedIn() {
//     const cookieStore = await cookies();
//     const sessionId = cookieStore.get('session_id');
//     if (!sessionId) {
//         return false;
//     }
//     const session = await prisma.session.findFirst({
//         where: {
//             value: sessionId.value,
//         },
//     });
//     return !!session;
// }