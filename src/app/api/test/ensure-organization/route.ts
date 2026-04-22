import { fetchAuthMutation } from '@/features/auth/auth-server';
import { api as convexApi } from '@/convex/_generated/api';

export async function POST(request: Request) {
    if (process.env.ALLOW_SETUP_TEST !== 'true') {
        return new Response('Setup test endpoint disabled', { status: 403 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as {
            organizationName?: string;
            createPersonalCategory?: boolean;
        };

        const result = await fetchAuthMutation(convexApi.setup.ensureTestOrganization, {
            organizationName: body.organizationName,
            createPersonalCategory: body.createPersonalCategory ?? true,
        });

        return Response.json({
            success: true,
            organizationId: result.organizationId,
            memberId: result.memberId,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Ensure organization failed';
        return Response.json({ success: false, error: message }, { status: 500 });
    }
}
