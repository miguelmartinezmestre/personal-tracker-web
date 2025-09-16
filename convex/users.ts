import { query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { betterAuthComponent } from "./auth";
import { Id } from "./_generated/dataModel";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    // You can get the user id directly from Convex via ctx.auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    // For now the id type requires an assertion
    const userIdFromCtx = identity.subject as Id<"users">;

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

// export const getAccountDetails = query({
//     args: {},
//     handler: async (ctx) => {
//         const userId = await getAuthUserId(ctx);
//         if (!userId) throw new ConvexError("Unauthorized");
//         const user = await ctx.db.get(userId);
//         if (!user) return { email: "", username: "", role: "" };
//         return {
//             email: (user as any).email ?? "",
//             username: (user as any).username ?? "",
//             role: (user as any).role ?? "",
//         };
//     },
// });

// export const updateAccountDetails = mutation({
//     args: {
//         email: v.string(),
//         username: v.string(),
//     },
//     handler: async (ctx, args) => {
//         const userId = await getAuthUserId(ctx);
//         if (!userId) throw new ConvexError("Unauthorized");
//         await ctx.db.patch(userId, { email: args.email /* username field not present in convex auth user */ });
//         return { message: "Account details updated", error: false } as const;
//     },
// });