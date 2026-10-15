import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NEXT_PUBLIC_CONVEX_URL } from '@/lib/env';

export async function isPlatformSetUp(): Promise<boolean> {
    const client = new ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL);
    return await client.query(api.setup.isPlatformSetUp);
}
