import type { authClient } from '@/features/auth/client';
import { throwIfAuthClientError } from '@/features/auth/auth-client-response';

type AdminAccount = { username: string; email: string; password: string };

type SetupAuthClient = {
    signUp: Pick<typeof authClient.signUp, 'email'>;
    signIn: Pick<typeof authClient.signIn, 'email'>;
};

export async function createOrResumeSetupAccount(
    client: SetupAuthClient,
    admin: AdminAccount,
    fetchOptions: { headers: Record<string, string> } | undefined
): Promise<{ message?: string } | null> {
    const signUpResult = await client.signUp.email({
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
        await client.signIn.email({ email: admin.email, password: admin.password })
    );

    return null;
}
