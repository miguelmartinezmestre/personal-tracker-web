import { extractErrorCode } from '@/lib/error-messages';
import { api } from '@/convex/_generated/api';
import { convexBetterAuth } from 'kitcn/auth/nextjs';
import { fetchQuery, type NextjsOptions } from 'convex/nextjs';
import type { ArgsAndOptions, FunctionReference, FunctionReturnType } from 'convex/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import { NEXT_PUBLIC_CONVEX_SITE_URL, NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';

const { createContext, createCaller, handler } = convexBetterAuth({
    api,
    convexSiteUrl: NEXT_PUBLIC_CONVEX_SITE_URL,
    convexUrl: NEXT_PUBLIC_CONVEX_URL,
});

const createRSCContext = cache(async () =>
    createContext({
        headers: await headers(),
    })
);

const caller = createCaller(createRSCContext);
const AUTH_REQUIRED_ERROR = 'AUTH_REQUIRED';

export function isAuthRequiredError(error: unknown): boolean {
    return extractErrorCode(error) === AUTH_REQUIRED_ERROR;
}

async function withAuthOptions<Func extends FunctionReference<'query' | 'mutation'>>(
    args: ArgsAndOptions<Func, NextjsOptions>
): Promise<ArgsAndOptions<Func, NextjsOptions>> {
    const token = await getToken();

    if (!token) {
        throw new Error(AUTH_REQUIRED_ERROR);
    }

    const functionArgs = args[0] ?? {};
    const existingOptions = args[1];

    const nextArgs: ArgsAndOptions<Func, NextjsOptions> = [
        functionArgs,
        {
            ...existingOptions,
            token,
            url: NEXT_PUBLIC_CONVEX_URL,
        },
    ];

    return nextArgs;
}

export const getToken = () => caller.getToken();

export async function fetchAuthQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    ...args: ArgsAndOptions<Query, NextjsOptions>
): Promise<FunctionReturnType<Query>> {
    return fetchQuery(query, ...(await withAuthOptions(args)));
}

export { handler };
