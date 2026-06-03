import 'server-only';
import { fetchAuthQuery } from './auth-server';
import { api } from '@/convex/_generated/api';
import { isGlobalAdminRole } from '@shared/platform-roles';

export async function getCurrentUser() {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    return user;
}

export async function isAdmin() {
    const user = await getCurrentUser();
    return isGlobalAdminRole(user?.role);
}
