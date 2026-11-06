import { v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { doc } from 'convex-helpers/validators';
import { query } from './_generated/server';
import schema from './schema';

// The only app function in the component: the adapter cannot read search indexes, so the admin
// user search lives next to the table. Everything else goes through ./adapter from the app.
export const search = query({
    args: {
        field: v.union(v.literal('name'), v.literal('email')),
        search: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginationResultValidator(doc(schema, 'user')),
    handler: async (ctx, args) => {
        const users = ctx.db.query('user');

        return args.field === 'email'
            ? await users
                  .withSearchIndex('search_user_email', q => q.search('email', args.search))
                  .paginate(args.paginationOpts)
            : await users
                  .withSearchIndex('search_user_name', q => q.search('name', args.search))
                  .paginate(args.paginationOpts);
    },
});
