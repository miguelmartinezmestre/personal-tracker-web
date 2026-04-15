import { NextRequest } from 'next/server';
import { fetchAuthMutation } from '@/features/auth/auth-server';
import { api as convexApi } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
    if (process.env.ALLOW_SETUP_TEST !== 'true') {
        return new Response('Setup test endpoint disabled', { status: 403 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as {
            platformName?: string;
            organizationName?: string;
        };

        const result = await fetchAuthMutation(convexApi.setup.completeSetup, {
            platformName: body.platformName ?? 'Test Platform',
            defaultLanguage: 'en',
            registrationPolicy: 'open',
            organizationName: body.organizationName ?? 'Test Organization',
            categories: [
                { name: 'Health', color: '#EF4444', icon: 'heart' },
                { name: 'Career', color: '#3B82F6', icon: 'briefcase' },
                { name: 'Personal', color: '#F59E0B', icon: 'user' },
            ],
        });

        return Response.json({ success: true, organizationId: result.organizationId });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Setup failed';
        return Response.json({ success: false, error: message }, { status: 500 });
    }
}
