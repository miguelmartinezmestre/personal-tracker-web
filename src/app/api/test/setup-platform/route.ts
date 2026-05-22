import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthMutation } from '@/features/auth/auth-server';
import { api as convexApi } from '@/convex/_generated/api';

function isLoopbackUrl(value: string | undefined): boolean {
    if (!value) return false;

    try {
        const hostname = new URL(value).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
        return false;
    }
}

const isTestEndpointEnabled = () =>
    process.env.ALLOW_SETUP_TEST === 'true' &&
    (process.env.NODE_ENV !== 'production' ||
        (Boolean(process.env.E2E_SETUP_SECRET) &&
            isLoopbackUrl(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL)));

export async function POST(request: NextRequest) {
    if (!isTestEndpointEnabled()) {
        return NextResponse.json({ error: 'Test endpoints disabled' }, { status: 403 });
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

        return NextResponse.json({ success: true, organizationId: result.organizationId });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Setup failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
