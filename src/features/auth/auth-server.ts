import { api } from '@/convex/_generated/api';
import { convexBetterAuth } from 'kitcn/auth/nextjs';
import { fetchQuery, type NextjsOptions } from 'convex/nextjs';
import type { ArgsAndOptions, FunctionReference, FunctionReturnType } from 'convex/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import { env } from '@/lib/env';

const { createContext, createCaller, handler } = convexBetterAuth({
    api,
    convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
    convexUrl: env.NEXT_PUBLIC_CONVEX_URL,
});

const createRSCContext = cache(async () =>
    createContext({
        headers: await headers(),
    })
);

const caller = createCaller(createRSCContext);
const AUTH_REQUIRED_ERROR = 'AUTH_REQUIRED';

async function withAuthOptions<Func extends FunctionReference<'query' | 'mutation'>>(
    args: ArgsAndOptions<Func, NextjsOptions>
): Promise<ArgsAndOptions<Func, NextjsOptions>> {
    const [functionArgs, options] = args as [Func['_args'] | undefined, NextjsOptions | undefined];
    const token = await getToken();
    if (!token) {
        throw new Error(AUTH_REQUIRED_ERROR);
    }

    return [
        functionArgs ?? {},
        {
            ...options,
            token,
            url: env.NEXT_PUBLIC_CONVEX_URL,
        },
    ] as ArgsAndOptions<Func, NextjsOptions>;
}

export const getToken = () => caller.getToken();

export async function fetchAuthQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    ...args: ArgsAndOptions<Query, NextjsOptions>
): Promise<FunctionReturnType<Query>> {
    return fetchQuery(query, ...(await withAuthOptions(args)));
}

export { handler };
