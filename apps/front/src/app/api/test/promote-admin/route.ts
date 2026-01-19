import { NextRequest } from 'next/server';
import { fetchAuthMutation } from '@/features/auth/auth-server';
import { api as convexApi } from '@repo/backend/convex/_generated/api';

export async function POST(_request: NextRequest) {
    if (process.env.ALLOW_PROMOTE_DEV !== 'true') {
        return new Response('Promote admin disabled', { status: 403 });
    }

    const user = await fetchAuthMutation(convexApi.testAdmin.promoteSelfToAdmin, {});

    return Response.json({ success: true, userId: user.userId });
}
