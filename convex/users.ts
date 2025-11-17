// import { mutation, query } from "./_generated/server";
// import { ConvexError, v } from "convex/values";
// import { authComponent } from "./auth";
// import { Id } from "./_generated/dataModel";
// import { createAuth } from "./auth";
// import { create } from "./betterAuth/adapter";

// export const getUser = query({
//   args: {},
//   handler: async (ctx) => {
//     // You can get the user id directly from Convex via ctx.auth
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       return null;
//     }

//     // For now the id type requires an assertion
//     // const userIdFromCtx = identity.subject as Id<"users">;

//     // The component provides a convenience method to get the user id
//     const user = await authComponent.getAuthUser(ctx);
//     if (!user) {
//       return null;
//     }
//     return user.userId;
//   }
// });

// export const getAccountDetails = query({
//   args: {},
//   handler: async (ctx) => {
//     const user = await authComponent.getAuthUser(ctx);
//     if (!user) throw new ConvexError("Unauthorized");
//     return {
//       email: user.email ?? "",
//       username: user.name ?? "",
//     };
//   },
// });

// export const updateAccountDetails = mutation({
//   args: {
//     email: v.string(),
//     username: v.string(),
//   },
//   handler: async (ctx) => {
//     const user = await authComponent.getAuthUser(ctx);
//     if (!user) throw new ConvexError("Unauthorized");
//     await ctx.db.patch(user.userId as Id<"users">, {});
//     return { message: "Account details updated", error: false } as const;
//   },
// });

// export const getUsers = query({
//   args: {},
//   handler: async (ctx) => {
//     return await createAuth(ctx).api.listUserAccounts({
//       query: {},
//       headers: await authComponent.getHeaders(ctx),
//     });
//   }
// });

// // export const setRole = mutation({
// //   args: {
// //     // userId: v.id("users"),
// //     // role: v.string(),
// //   },
// //   handler: async (ctx) => {

// //     const userId = await authComponent.getAuthUserId(ctx);

// //     if (!userId) {
// //       throw new ConvexError("User not authenticated");
// //     }

// //     return await createAuth(ctx).api.setRole({
// //       body: {
// //         userId: userId,
// //         role: "admin", // required
// //       },
// //       headers: await authComponent.getHeaders(ctx),
// //     });
// //   }
// // });
