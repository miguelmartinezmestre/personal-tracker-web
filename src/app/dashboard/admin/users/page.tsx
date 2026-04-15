import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@/convex/_generated/api';
import UsersLayout from '@/features/admin/components/users/users-layout';
import { isAdmin } from '@/features/auth/current-user';
import { redirect } from 'next/navigation';
import { Preloaded } from 'convex/react';

export default async function UsersPage() {
    if (!(await isAdmin())) {
        redirect('/dashboard/home');
    }

    let preloadedUsersQuery: Preloaded<typeof api.admin.listUsers>;

    try {
        preloadedUsersQuery = await preloadAuthQuery(api.admin.listUsers, {
            paginationOpts: {
                numItems: 10,
                cursor: null,
            },
        });
    } catch {
        redirect('/dashboard/home');
    }

    return <UsersLayout preloadedUsersQuery={preloadedUsersQuery} />;
}
