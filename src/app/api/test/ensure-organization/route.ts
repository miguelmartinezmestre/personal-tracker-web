import { fetchAuthMutation } from '@/features/auth/auth-server';
import { api as convexApi } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
    if (!isTestEndpointEnabled()) {
        return NextResponse.json({ error: 'Test endpoints disabled' }, { status: 403 });
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

        return NextResponse.json({
            success: true,
            organizationId: result.organizationId,
            memberId: result.memberId,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Ensure organization failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
