import { preloadAuthQuery } from '@/features/auth/server';
import { api } from '@/convex/_generated/api';
import { UsersLayout } from '@/features/admin';
import { isAdmin } from '@/features/auth/server';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';
import { ADMIN_PAGINATION_OPTS } from '@/lib/pagination';

export default async function UsersPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    let preloadedUsersQuery: Preloaded<typeof api.admin.listUsers>;

    try {
        preloadedUsersQuery = await preloadAuthQuery(api.admin.listUsers, {
            paginationOpts: ADMIN_PAGINATION_OPTS,
        });
    } catch {
        redirect('/dashboard/home');
    }

    return <UsersLayout preloadedUsersQuery={preloadedUsersQuery} />;
}
