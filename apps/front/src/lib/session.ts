'use server';

import { fetchQuery } from 'convex/nextjs';
import { getToken } from './auth-simple';
import { api } from '@repo/backend/convex/_generated/api';

export async function getCurrentUser() {
    const token = await getToken();
    await fetchQuery(api.auth.getCurrentUser, {}, { token });
}
