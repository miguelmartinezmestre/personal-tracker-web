import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';

export async function isPlatformSetupUser(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy === userId;
}

export async function getPlatformSetupUserId(ctx: { db: DatabaseReader }) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy ?? null;
}
