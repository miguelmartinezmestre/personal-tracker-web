import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/trpc/routers/router';
import { createContext } from '@/trpc/init';
import { RedirectError } from '@/server/redirect-error';
import { redirect } from 'next/navigation';

const handler = (req: Request) => {
    return fetchRequestHandler({
        req,
        endpoint: '/api/trpc',
        router: appRouter,
        createContext,
    });
};

// const handler = async (req: Request) => {
//   try {
//     return await fetchRequestHandler({
//       req,
//       endpoint: '/api/trpc',
//       router: appRouter,
//       createContext,
//     })
//   } catch (error) {
//     if (error instanceof RedirectError) {
//       console.log("error url1", error.url)
//       // return new Response(null, {
//       //   status: 303, // Status code for redirections after POST
//       //   headers: {
//       //     Location: error.url,
//       //   },
//       // })
//       // console.log("error url", error.url)
//       // redirect(error.url)
//     }
//     console.log("error2", error)
//     // throw error
//   }
// }

export { handler as GET, handler as POST };
