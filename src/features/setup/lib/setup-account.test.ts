import { beforeEach, expect, test, vi } from 'vitest';
import { createOrResumeSetupAccount } from './setup-account';

const signUp = vi.fn();
const signIn = vi.fn();

const client = { signUp: { email: signUp }, signIn: { email: signIn } };

const admin = { username: 'Ada', email: 'ada@example.com', password: 'Password123' };

beforeEach(() => {
    signUp.mockReset();
    signIn.mockReset();
});

test('creates the account without signing in again @INH-SET-01', async () => {
    signUp.mockResolvedValue({ data: {}, error: null });
    await expect(createOrResumeSetupAccount(client, admin, undefined)).resolves.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
});

test('signs into the account an earlier failed attempt created @INH-SET-01', async () => {
    signUp.mockResolvedValue({
        data: null,
        error: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'exists' },
    });
    signIn.mockResolvedValue({ data: {}, error: null });
    await expect(createOrResumeSetupAccount(client, admin, undefined)).resolves.toBeNull();
    expect(signIn).toHaveBeenCalledWith({ email: admin.email, password: admin.password });
});
