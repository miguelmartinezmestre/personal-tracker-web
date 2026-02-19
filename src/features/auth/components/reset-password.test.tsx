import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from './reset-password';

const { resetPasswordMock, tokenState } = vi.hoisted(() => ({
    resetPasswordMock: vi.fn(),
    tokenState: { token: 'token_123', key: null as string | null },
}));

vi.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: (key: string) => {
            if (key === 'token') return tokenState.token;
            if (key === 'key') return tokenState.key;
            return null;
        },
    }),
}));

vi.mock('next-intl', () => ({
    useTranslations: (namespace: string) => (key: string) => {
        const labels: Record<string, string> = {
            'Common.error': 'Error',
            'Common.success': 'Success',
            'Common.genericErrorDescription': 'Something went wrong',
            'Common.fields.password': 'Password',
            'Common.fields.confirmPassword': 'Confirm password',
            'Common.placeholders.min8Chars': 'At least 8 chars',
            'Common.placeholders.confirmPassword': 'Repeat password',
            'HomePage.resetPassword': 'Reset password',
            'HomePage.resetPasswordSuccess': 'Password changed successfully',
            'HomePage.alreadyHaveAccount': 'Already have an account?',
            'HomePage.login': 'Log in',
        };

        return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    },
}));

vi.mock('@/features/auth/auth-client', () => ({
    authClient: {
        resetPassword: resetPasswordMock,
    },
}));

describe('ResetPassword', () => {
    beforeEach(() => {
        tokenState.token = 'token_123';
        tokenState.key = null;
        resetPasswordMock.mockReset();
    });

    it('submits new password using token query param', async () => {
        resetPasswordMock.mockResolvedValue({ error: null });

        const user = userEvent.setup();
        render(<ResetPassword />);

        const passwordInputs = screen.getAllByLabelText(/password/i);
        await user.type(passwordInputs[0], 'newpassword123');
        await user.type(passwordInputs[1], 'newpassword123');
        await user.click(screen.getByRole('button', { name: 'Reset password' }));

        await waitFor(() => {
            expect(resetPasswordMock).toHaveBeenCalledWith({
                newPassword: 'newpassword123',
                token: 'token_123',
            });
        });
        expect(await screen.findByText('Password changed successfully')).toBeInTheDocument();
    });

    it('falls back to key query param when token is missing', async () => {
        tokenState.token = null as unknown as string;
        tokenState.key = 'fallback_key';
        resetPasswordMock.mockResolvedValue({ error: null });

        const user = userEvent.setup();
        render(<ResetPassword />);

        const passwordInputs = screen.getAllByLabelText(/password/i);
        await user.type(passwordInputs[0], 'newpassword123');
        await user.type(passwordInputs[1], 'newpassword123');
        await user.click(screen.getByRole('button', { name: 'Reset password' }));

        await waitFor(() => {
            expect(resetPasswordMock).toHaveBeenCalledWith({
                newPassword: 'newpassword123',
                token: 'fallback_key',
            });
        });
    });

    it('does not submit when passwords do not match', async () => {
        const user = userEvent.setup();
        render(<ResetPassword />);

        const passwordInputs = screen.getAllByLabelText(/password/i);
        await user.type(passwordInputs[0], 'newpassword123');
        await user.type(passwordInputs[1], 'differentpassword');
        await user.click(screen.getByRole('button', { name: 'Reset password' }));

        await waitFor(() => {
            expect(resetPasswordMock).not.toHaveBeenCalled();
        });
    });

    it('renders login link', () => {
        render(<ResetPassword />);

        expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    });
});
