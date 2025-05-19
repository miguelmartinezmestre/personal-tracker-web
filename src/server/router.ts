import { inferRouterOutputs, inferRouterInputs } from "@trpc/server";
import { createTRPCRouter } from "./init";
import { objectivesRouter } from "./objectives.router";

export const appRouter = createTRPCRouter({
  objectives: objectivesRouter,
  });
  
  // export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;