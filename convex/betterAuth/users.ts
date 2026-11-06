import { v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { paginator } from 'convex-helpers/server/pagination';
import { query } from './_generated/server';
import schema from './schema';

// The app's only functions in the component: the adapter can read neither search indexes nor
// unset fields through an index (it filters `deletedAt = null` after paginating), so the admin
// user list lives next to the table. Everything else goes through ./adapter from the app.
// Live accounts never have `deletedAt` written, so `undefined` selects exactly them.

const userPageValidator = paginationResultValidator(schema.doc('user'));

export const listActive = query({
    args: { paginationOpts: paginationOptsValidator },
    returns: userPageValidator,
    handler: async (ctx, args) => {
        return await paginator(ctx.db, schema)
            .query('user')
            .withIndex('by_deletedAt_and_email', q => q.eq('deletedAt', undefined))
            .paginate(args.paginationOpts);
    },
});

export const search = query({
    args: {
        field: v.union(v.literal('name'), v.literal('email')),
        search: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    returns: userPageValidator,
    handler: async (ctx, args) => {
        const users = ctx.db.query('user');

        return args.field === 'email'
            ? await users
                  .withSearchIndex('search_user_email', q =>
                      q.search('email', args.search).eq('deletedAt', undefined)
                  )
                  .paginate(args.paginationOpts)
            : await users
                  .withSearchIndex('search_user_name', q =>
                      q.search('name', args.search).eq('deletedAt', undefined)
                  )
                  .paginate(args.paginationOpts);
    },
});
