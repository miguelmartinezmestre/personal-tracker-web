import { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
import { createTRPCRouter } from '../init';
import { objectivesRouter } from './objectives.router';
import { userRouter } from './user.router';
import { getUserId } from '@/server/getUserId';

export const appRouter = createTRPCRouter({
    objectives: objectivesRouter,
    user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
// export type RouterOutputs = inferRouterOutputs<AppRouter>;
// export type RouterInputs = inferRouterInputs<AppRouter>;
// export const caller = appRouter.createCaller(async () => {
//     const userId = await getUserId();
//     return { userId };
// });
