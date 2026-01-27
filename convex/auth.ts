import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createApi, createClient, getAuthUserIdentity, type AuthFunctions } from "better-convex/auth";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalMutation, query, type ActionCtx, type MutationCtx, type QueryCtx } from "./_generated/server";
import authConfig from "./auth.config";
import schema from "./schema";
import { admin, organization } from "better-auth/plugins";
import { ConvexError } from "convex/values";


type GenericCtx = QueryCtx | MutationCtx | ActionCtx;


const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
// const emailApiUrl = process.env.EMAIL_API_URL ?? 'http://localhost:3001';

// Only require email verification in production when email service is configured
// const isProduction = process.env.NODE_ENV === 'production';
// const requireEmailVerification: boolean = !!(isProduction && process.env.EMAIL_API_URL);

const authFunctions: AuthFunctions = internal.auth;

// async function sendWelcomeEmail(data: { to: string; name: string }): Promise<void> {
//     if (!process.env.EMAIL_API_URL) return;

//     const url = `${emailApiUrl}/api/email/welcome`;
//     try {
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(data),
//         });
//         if (!response.ok) {
//             const errorText = await response.text();
//             console.error('[sendWelcomeEmail] Failed to send email:', errorText);
//         }
//     } catch (error) {
//         console.error('[sendWelcomeEmail] Error sending email:', error);
//     }
// }

export const authClient = createClient<DataModel, typeof schema>({
  authFunctions,
  schema,
  internalMutation, // Optional: custom mutation wrapper for triggers
  triggers: {},
});


// Auth options factory
const createAuthOptions = (ctx: GenericCtx) =>
  ({
    baseURL: process.env.SITE_URL!,
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex({
        authConfig,
        jwks: process.env.JWKS,
      }),
      admin(),
      organization({
        invitationExpiry: false,
        defaultRole: 'member',
        sendInvitationEmail: async data => {
          const inviteLink = `${siteUrl}/invitations/${data.id}`;
          console.log('[auth:sendInvitationEmail] Invite link:', inviteLink);
        },
      }),
    ],
    database: authClient.httpAdapter(ctx),
  }) satisfies BetterAuthOptions;
// For queries/mutations: direct DB access
export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) =>
  betterAuth({
    ...createAuthOptions(ctx),
    database: authClient.adapter(ctx, createAuthOptions),
  });
// For actions/HTTP routes: HTTP adapter
export const createAuth = (ctx: ActionCtx) =>
  betterAuth(createAuthOptions(ctx));
// Generate internal CRUD functions
export const {
  create,
  deleteMany,
  deleteOne,
  findMany,
  findOne,
  updateMany,
  updateOne,
  getLatestJwks,
  rotateKeys,
} = createApi(schema, createAuth, {
  internalMutation, // Optional: same wrapper as createClient
});
// Generate trigger handlers
export const {
  beforeCreate,
  beforeDelete,
  beforeUpdate,
  onCreate,
  onDelete,
  onUpdate,
} = authClient.triggersApi();
// Export for Better Auth CLI
// biome-ignore lint/suspicious/noExplicitAny: Required for CLI
export const auth = betterAuth(createAuthOptions({} as any));


export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await getAuthUserIdentity(ctx);
    if (!identity) throw new ConvexError("Unauthenticated");
    return await ctx.db.get('user', identity.userId);
  },
});