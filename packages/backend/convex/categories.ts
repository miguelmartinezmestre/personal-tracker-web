import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { createAuditLog, sanitizeForAudit, createChangeDiff } from './utils/auditLog';

export const getCategoriesByUser = queryWithRLS({
    args: {},
    handler: async ctx => {
        return await ctx.db
            .query('categories')
            .withIndex('by_user', q => q.eq('user', String(ctx.identity?.subject)))
            .collect();
    },
});

export const createCategory = mutationWithRLS({
    args: {
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const userId = String(ctx.identity?.subject);
        const categoryId = await ctx.db.insert('categories', {
            user: userId,
            name: args.name,
            color: args.color,
            icon: args.icon,
            createdAt: now,
            updatedAt: now,
        });

        // Audit log
        await createAuditLog(ctx, {
            userId,
            action: 'category.created',
            resourceType: 'category',
            resourceId: categoryId,
            metadata: {
                after: { name: args.name, color: args.color, icon: args.icon },
            },
        });

        return categoryId;
    },
});

export const updateCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
        name: v.optional(v.string()),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        const existing = await ctx.db.get('categories', id);
        if (!existing) {
            throw new Error('Category not found');
        }

        const result = await ctx.db.patch('categories', id, { ...rest, updatedAt: Date.now() });

        // Audit log
        const changes = createChangeDiff(sanitizeForAudit(existing), rest);
        if (Object.keys(changes.after).length > 0) {
            await createAuditLog(ctx, {
                userId: existing.user,
                action: 'category.updated',
                resourceType: 'category',
                resourceId: id,
                metadata: {
                    before: changes.before,
                    after: changes.after,
                    context: `Updated category: ${existing.name}`,
                },
            });
        }

        return result;
    },
});

export const deleteCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('categories', args.id);

        const result = await ctx.db.delete('categories', args.id);

        // Audit log
        if (existing) {
            await createAuditLog(ctx, {
                userId: existing.user,
                action: 'category.deleted',
                resourceType: 'category',
                resourceId: args.id,
                metadata: {
                    before: sanitizeForAudit(existing),
                    context: `Deleted category: ${existing.name}`,
                },
                severity: 'critical',
            });
        }

        return result;
    },
});

// Default categories for new users
export const createDefaultCategories = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const user = String(ctx.identity?.subject);
        const now = Date.now();
        const defaultCategories = [
            { name: 'Health & Fitness', color: '#10b981', icon: 'heart' },
            { name: 'Career & Business', color: '#3b82f6', icon: 'briefcase' },
            { name: 'Learning & Education', color: '#8b5cf6', icon: 'book' },
            { name: 'Personal Development', color: '#f59e0b', icon: 'user' },
            { name: 'Finance & Savings', color: '#22c55e', icon: 'dollar-sign' },
            { name: 'Relationships', color: '#ec4899', icon: 'users' },
            { name: 'Creative Projects', color: '#a855f7', icon: 'palette' },
            { name: 'Home & Organization', color: '#06b6d4', icon: 'home' },
            { name: 'Travel & Adventure', color: '#f97316', icon: 'map' },
        ];

        const results = [];
        for (const category of defaultCategories) {
            const id = await ctx.db.insert('categories', {
                user,
                name: category.name,
                color: category.color,
                icon: category.icon,
                createdAt: now,
                updatedAt: now,
            });
            results.push(await ctx.db.get('categories', id));
        }

        // Audit log
        await createAuditLog(ctx, {
            userId: user,
            action: 'category.defaults_created',
            resourceType: 'category',
            metadata: {
                after: { count: defaultCategories.length },
                context: `Created ${defaultCategories.length} default categories`,
            },
        });

        return results;
    },
});
