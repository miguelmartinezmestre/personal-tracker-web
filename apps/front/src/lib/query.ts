"use server";

import { fetchQuery } from "convex/nextjs";
import { getToken } from "./auth-sever";
import type { FunctionReference } from "convex/server";

export async function queryConvex<T>(query: FunctionReference<"query">, args: any): Promise<T> {
    const token = await getToken();
    return fetchQuery(
        query,
        args,
        { token }
    );
}