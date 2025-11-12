import { createAuth } from "../../convex/auth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { cookies } from "next/headers";

export const getToken = async () => {
  // Read request cookies to ensure this code runs after accessing Request data,
  // satisfying Next.js requirement before any random access happens downstream.
  await cookies();
  return getTokenNextjs(createAuth);
};