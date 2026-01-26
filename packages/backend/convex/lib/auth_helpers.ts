// import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
// import type { DataModel, Id } from '../_generated/dataModel';
// import { authComponent, createAuth } from '../auth';

// type QueryCtx = GenericQueryCtx<DataModel>;
// type MutationCtx = GenericMutationCtx<DataModel>;

// /**
//  * Get the current user identity from the auth context
//  */
// export const getAuthUserIdentity = async (ctx: QueryCtx | MutationCtx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return null;

//     return {
//         ...identity,
//         sessionId: identity.sessionId as Id<'session'>,
//         userId: identity.subject as Id<'user'>,
//     };
// };

// /**
//  * Get the current user ID from the auth context
//  */
// export const getAuthUserId = async (ctx: QueryCtx | MutationCtx) => {
//     const identity = await getAuthUserIdentity(ctx);
//     if (!identity) return null;
//     return identity.userId;
// };

// /**
//  * Get the current session from the database
//  */
// export const getSession = async (
//     ctx: QueryCtx | MutationCtx,
//     _sessionId?: Id<'session'>
// ) => {
//     let sessionId: Id<'session'> | undefined = _sessionId;

//     if (!sessionId) {
//         const identity = await getAuthUserIdentity(ctx);
//         if (!identity) return null;
//         sessionId = identity.sessionId;
//     }

//     return ctx.db.get(sessionId);
// };

// /**
//  * Get headers for the current session (for Better Auth API calls)
//  */
// export const getHeaders = async (
//     ctx: QueryCtx | MutationCtx,
//     session?: Awaited<ReturnType<typeof getSession>>
// ) => {
//     const resolvedSession = session ?? (await getSession(ctx));
//     if (!resolvedSession) return new Headers();

//     return new Headers({
//         ...(resolvedSession.token
//             ? { authorization: `Bearer ${resolvedSession.token}` }
//             : {}),
//         ...(resolvedSession.ipAddress
//             ? { 'x-forwarded-for': resolvedSession.ipAddress as string }
//             : {}),
//     });
// };

// /**
//  * User with session context and organization info
//  */
// export interface SessionUser {
//     _id: Id<'user'>;
//     name: string;
//     email: string;
//     emailVerified: boolean;
//     image?: string | null;
//     createdAt: number;
//     updatedAt: number;
//     role?: string | null;
//     banned?: boolean | null;
//     banReason?: string | null;
//     banExpires?: number | null;
//     // Extended context
//     session: Awaited<ReturnType<typeof getSession>>;
//     activeOrganizationId: Id<'organization'> | null;
//     memberRole: string | null;
//     isAdmin: boolean;
// }

// /**
//  * Get the authenticated user with full context including organization info
//  */
// export const getSessionUser = async (
//     ctx: QueryCtx | MutationCtx
// ): Promise<SessionUser | null> => {
//     const session = await getSession(ctx);
//     if (!session) return null;

//     const user = await ctx.db.get(session.userId as Id<'user'>);
//     if (!user) return null;

//     const activeOrganizationId = session.activeOrganizationId as Id<'organization'> | null;

//     let memberRole: string | null = null;
//     if (activeOrganizationId) {
//         const member = await ctx.db
//             .query('member')
//             .withIndex('by_organizationId_userId', (q) =>
//                 q.eq('organizationId', activeOrganizationId).eq('userId', session.userId)
//             )
//             .collect();
//         memberRole = member?.role ?? null;
//     }

//     return {
//         ...user,
//         session,
//         activeOrganizationId,
//         memberRole,
//         isAdmin: user.role === 'admin',
//     };
// };

// /**
//  * Require authentication or throw an error
//  */
// export const requireAuth = async (ctx: QueryCtx | MutationCtx): Promise<SessionUser> => {
//     const user = await getSessionUser(ctx);
//     if (!user) {
//         throw new Error('Unauthorized: User not authenticated');
//     }
//     return user;
// };

// /**
//  * Require admin role or throw an error
//  */
// export const requireAdmin = async (ctx: QueryCtx | MutationCtx): Promise<SessionUser> => {
//     const user = await requireAuth(ctx);
//     if (!user.isAdmin) {
//         throw new Error('Forbidden: Admin access required');
//     }
//     return user;
// };

// /**
//  * Get the Better Auth instance and headers for making API calls
//  */
// export const getBetterAuth = async (ctx: QueryCtx | MutationCtx) => {
//     return authComponent.getAuth(createAuth, ctx);
// };
