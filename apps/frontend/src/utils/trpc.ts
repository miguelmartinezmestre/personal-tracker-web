import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '../../../backend/src/routers/app.router';
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
