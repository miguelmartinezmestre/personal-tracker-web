import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgetPasswordForm from './forget-password';

const { requestPasswordResetMock } = vi.hoisted(() => ({
    requestPasswordResetMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
    useTranslations: (namespace: string) => (key: string) => {
        const labels: Record<string, string> = {
            'Common.error': 'Error',
            'Common.success': 'Success',
            'Common.fields.email': 'Email',
            'Common.placeholders.email': 'you@example.com',
            'Common.genericErrorDescription': 'Something went wrong',
            'ForgotPassword.submit': 'Send reset email',
            'ForgotPassword.successMessage': 'We sent a password reset email',
        };

        return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    },
}));

vi.mock('@/features/auth/auth-client', () => ({
    authClient: {
        requestPasswordReset: requestPasswordResetMock,
    },
}));

describe('ForgetPasswordForm', () => {
    beforeEach(() => {
        requestPasswordResetMock.mockReset();
    });

    it('submits reset request and shows success message', async () => {
        requestPasswordResetMock.mockResolvedValue({ error: null });

        const user = userEvent.setup();
        render(<ForgetPasswordForm />);

        await user.type(screen.getByTestId('email-input'), 'user@example.com');
        await user.click(screen.getByRole('button', { name: 'Send reset email' }));

        await waitFor(() => {
            expect(requestPasswordResetMock).toHaveBeenCalledWith({
                email: 'user@example.com',
                redirectTo: `${window.location.origin}/reset-password`,
            });
        });
        expect(await screen.findByText('We sent a password reset email')).toBeInTheDocument();
    });

    it('shows error message when request fails', async () => {
        requestPasswordResetMock.mockResolvedValue({
            error: {
                message: 'User not found',
            },
        });

        const user = userEvent.setup();
        render(<ForgetPasswordForm />);

        await user.type(screen.getByTestId('email-input'), 'user@example.com');
        await user.click(screen.getByRole('button', { name: 'Send reset email' }));

        expect(await screen.findByText('User not found')).toBeInTheDocument();
    });
});
