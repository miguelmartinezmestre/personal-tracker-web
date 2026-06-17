import 'server-only';
import { fetchAuthQuery } from './auth-server';
import { api } from '@/convex/_generated/api';
import { isGlobalAdminRole } from '@shared/platform-roles';

export async function isAdmin() {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    return isGlobalAdminRole(user?.role);
}
