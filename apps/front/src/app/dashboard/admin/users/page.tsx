import { preloadAuthQuery } from '@/features/auth/auth-server';
import { api } from '@repo/backend/convex/_generated/api';
import UsersLayout from '@/features/admin/components/users/users-layout';
import { requireAdmin } from '@/features/admin/utils/requiredAdmin';

export default async function UsersPage() {

    requireAdmin();

    const preloadedUsersQuery = await preloadAuthQuery(api.admin.listUsers, {
        paginationOpts: {
            numItems: 10,
            cursor: null,
        },
    });

    return <UsersLayout preloadedUsersQuery={preloadedUsersQuery} />;
}
