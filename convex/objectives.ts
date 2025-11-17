import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { Id } from "./_generated/dataModel";
import {
    customCtx,
    customMutation,
    customQuery,
} from "convex-helpers/server/customFunctions";
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import { DataModel } from "./_generated/dataModel";

async function rlsRules(ctx: QueryCtx) {
    const user = await authComponent.getAuthUser(ctx);
    const userId = user?._id ? String(user._id) : null;

    return {
        objectives: {
            read: async (_, objective) => {
                // Solo usuarios autenticados pueden leer objetivos
                if (!userId) return false;
                // Solo pueden leer sus propios objetivos
                return objective.user === userId;
            },
            insert: async (_, objective) => {
                // Solo usuarios autenticados pueden crear objetivos
                if (!userId) return false;
                // Solo pueden crear objetivos con su propio user ID
                return objective.user === userId;
            },
            modify: async (_, objective) => {
                // Solo usuarios autenticados pueden modificar objetivos
                if (!userId) return false;
                // Solo pueden modificar sus propios objetivos
                return objective.user === userId;
            },
        },
    } satisfies Rules<QueryCtx, DataModel>;
}

// Por defecto, las tablas sin regla tienen `defaultPolicy` configurado como "deny"
const config: RLSConfig = { defaultPolicy: "deny" };

const queryWithRLS = customQuery(
    query,
    customCtx(async (ctx) => ({
        db: wrapDatabaseReader(ctx, ctx.db, await rlsRules(ctx), config),
    })),
);

const mutationWithRLS = customMutation(
    mutation,
    customCtx(async (ctx) => ({
        db: wrapDatabaseWriter(ctx, ctx.db, await rlsRules(ctx), config),
    })),
);

export const getObjectivesByUser = queryWithRLS({
    args: {},
    handler: async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user || !user._id) throw new Error("User not authenticated");
        return await ctx.db
            .query("objectives")
            .withIndex("by_user", (q) => q.eq("user", user._id))
            .collect();
    },
});

export const getObjectiveById = queryWithRLS({
    args: {
        id: v.id("objectives"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const createObjective = mutationWithRLS({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(),
        unit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
        console.log(user);
        if (!user || !user._id) {
            throw new Error("User not authenticated");
        }
        const now = Date.now();
        return await ctx.db.insert("objectives", {
            user: user._id,
            title: args.title,
            description: args.description,
            category: args.category,
            targetValue: args.targetValue,
            currentValue: args.currentValue,
            deadline: args.deadline,
            status: args.status,
            unit: args.unit,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateObjective = mutationWithRLS({
    args: {
        id: v.id("objectives"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
        currentValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: v.optional(v.string()),
        unit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        return await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    },
});

export const deleteObjective = mutationWithRLS({
    args: {
        id: v.id("objectives"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});
