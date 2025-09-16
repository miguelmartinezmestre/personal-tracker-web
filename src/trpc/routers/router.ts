// // import { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
// import { createTRPCRouter } from '../init';
// import { objectivesRouter } from '@/trpc/routers/objectives.router';
// import { userRouter } from '@/trpc/routers/user.router';
// import { updateProgressRouter } from '@/trpc/routers/update-progress.router';
// import { teamsRouter } from '@/trpc/routers/teams.router';
// import { teamMembersRouter } from '@/trpc/routers/team-member.router';
// import { sessionsRouter } from './sessions.route';

// export const appRouter = createTRPCRouter({
//     objectives: objectivesRouter,
//     user: userRouter,
//     updateProgress: updateProgressRouter,
//     teams: teamsRouter,
//     teamMembers: teamMembersRouter,
//     sessions: sessionsRouter,
// });

// // export type definition of API
// export type AppRouter = typeof appRouter;
// // export type RouterOutputs = inferRouterOutputs<AppRouter>;
// // export type RouterInputs = inferRouterInputs<AppRouter>;
// // export const caller = appRouter.createCaller(async () => {
// //     const userId = await getUserId();
// //     return { userId };
// // });
