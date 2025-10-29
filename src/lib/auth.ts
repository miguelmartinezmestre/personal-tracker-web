import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireEnv } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth";
import { betterAuthComponent } from "../../convex/auth";
import { GenericCtx } from "../../convex/_generated/server";
import { admin } from "better-auth/plugins";

const siteUrl = requireEnv("SITE_URL");

export const createAuth = (ctx: GenericCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    // All auth requests will be proxied through your next.js server
    baseURL: siteUrl,
    database: convexAdapter(ctx, betterAuthComponent),

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // Cache duration in seconds
      },
    },

    // Simple non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required
      convex(),
      admin({
        adminUserIds: ["j5717hgq5t9rsqwfvpst4wrk917rps4c"],
      })
    ],
  });