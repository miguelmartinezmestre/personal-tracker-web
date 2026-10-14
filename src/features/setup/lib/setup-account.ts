import { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';

type AdminAccount = { username: string; email: string; password: string };

/**
 * Creates the setup admin account, or signs into it when an earlier attempt created it but failed
 * before completing setup: every route redirects to /setup until then, so there is no other way
 * back in. Returns the sign-up error to show, or null once the admin is signed in.
 */
export async function createOrResumeSetupAccount(
    admin: AdminAccount,
    fetchOptions: { headers: Record<string, string> } | undefined
): Promise<{ message?: string } | null> {
    const signUpResult = await authClient.signUp.email({
        name: admin.username,
        email: admin.email,
        password: admin.password,
        fetchOptions,
    });
    if (!signUpResult.error) {
        return null;
    }
    if (signUpResult.error.code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        return signUpResult.error;
    }
    throwIfAuthClientError(
        await authClient.signIn.email({ email: admin.email, password: admin.password })
    );
    return null;
}
