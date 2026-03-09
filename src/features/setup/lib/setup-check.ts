import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export async function checkPlatformSetUp(): Promise<boolean> {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return await client.query(api.setup.isPlatformSetUp);
}
