import 'server-only';
import { fetchAuthQuery } from './auth-server';
import { api } from '@/convex/_generated/api';

export async function getCurrentUser() {
    const user = await fetchAuthQuery(api.auth.getCurrentUser, {});
    return user;
}

export async function isAdmin() {
    const user = await getCurrentUser();
    return user?.role === 'admin';
}
