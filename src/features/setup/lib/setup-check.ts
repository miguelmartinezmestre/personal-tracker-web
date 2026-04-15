import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { env } from '@/lib/env';

export async function checkPlatformSetUp(): Promise<boolean> {
    const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
    return await client.query(api.setup.isPlatformSetUp);
}
