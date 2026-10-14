import { beforeEach, expect, test, vi } from 'vitest';

const signUp = vi.fn();
const signIn = vi.fn();
vi.mock('@/features/auth/client', () => ({
    authClient: { signUp: { email: signUp }, signIn: { email: signIn } },
}));

const { createOrResumeSetupAccount } = await import('./setup-account');

const admin = { username: 'Ada', email: 'ada@example.com', password: 'Password123' };

beforeEach(() => {
    signUp.mockReset();
    signIn.mockReset();
});

test('creates the account without signing in again', async () => {
    signUp.mockResolvedValue({ data: {}, error: null });
    await expect(createOrResumeSetupAccount(admin, undefined)).resolves.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
});

test('signs into the account an earlier failed attempt created', async () => {
    signUp.mockResolvedValue({
        data: null,
        error: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'exists' },
    });
    signIn.mockResolvedValue({ data: {}, error: null });
    await expect(createOrResumeSetupAccount(admin, undefined)).resolves.toBeNull();
    expect(signIn).toHaveBeenCalledWith({ email: admin.email, password: admin.password });
});

test('fails when the existing account has another password', async () => {
    signUp.mockResolvedValue({
        data: null,
        error: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'exists' },
    });
    signIn.mockResolvedValue({ data: null, error: { message: 'Invalid email or password' } });
    await expect(createOrResumeSetupAccount(admin, undefined)).rejects.toThrow(
        'Invalid email or password'
    );
});

test('returns any other sign-up error for the form to show', async () => {
    const error = { code: 'SETUP_SECRET_REQUIRED', message: 'Bad secret' };
    signUp.mockResolvedValue({ data: null, error });
    await expect(createOrResumeSetupAccount(admin, undefined)).resolves.toBe(error);
    expect(signIn).not.toHaveBeenCalled();
});
