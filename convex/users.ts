import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { betterAuthComponent } from "./auth";
import { Id } from "./_generated/dataModel";
import { createAuth } from "../src/lib/auth";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    // You can get the user id directly from Convex via ctx.auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    // For now the id type requires an assertion
    // const userIdFromCtx = identity.subject as Id<"users">;

    // The component provides a convenience method to get the user id
    const userId = await betterAuthComponent.getAuthUserId(ctx);
    if (!userId) {
      return null
    }

    const user = await ctx.db.get(userId as Id<"users">);


    // Get user email and other metadata from the Better Auth component
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);

    // You can combine them if you want
    return { ...userMetadata, ...user };
  }
});

export const getAccountDetails = query({
    args: {},
    handler: async (ctx) => {
        const userId = await betterAuthComponent.getAuthUserId(ctx);
        if (!userId) throw new ConvexError("Unauthorized");
        const user = await ctx.db.get(userId as Id<"users">);
        if (!user) return { email: "", username: "", role: "" };
        return {
            email: (user as any).email ?? "",
            username: (user as any).username ?? "",
            role: (user as any).role ?? "",
        };
    },
});

export const updateAccountDetails = mutation({
    args: {
        email: v.string(),
        username: v.string(),
    },
    handler: async (ctx) => {
        const userId = await betterAuthComponent.getAuthUserId(ctx);
        if (!userId) throw new ConvexError("Unauthorized");
        await ctx.db.patch(userId as Id<"users">, { });
        return { message: "Account details updated", error: false } as const;
    },
});

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    return await createAuth(ctx).api.listUserAccounts({
      query: {},
      headers: await betterAuthComponent.getHeaders(ctx),
    });
  }
});

export const setRole = mutation({
  args: {
    // userId: v.id("users"),
    // role: v.string(),
  },
  handler: async (ctx) => {

    const userId = await betterAuthComponent.getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    return await createAuth(ctx).api.setRole({
      body: {
        userId: userId,
        role: "admin", // required
      },
      headers: await betterAuthComponent.getHeaders(ctx),
    });
  }
});
