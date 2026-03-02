import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PasswordFormEdit from './password-form-edit';

const { changePasswordMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      password: 'Current password',
      confirmPassword: 'Confirm current password',
      newPassword: 'New password',
      cancel: 'Cancel',
      saving: 'Saving',
      savePassword: 'Save password',
      passwordMismatch: 'Current password confirmation does not match',
      passwordSameAsOld: 'New password must be different',
      passwordUpdated: 'Password updated',
      passwordUpdateFailed: 'Password update failed',
    };

    return labels[key] ?? key;
  },
}));

vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    changePassword: changePasswordMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('PasswordFormEdit', () => {
  beforeEach(() => {
    changePasswordMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('blocks submit when current password confirmation mismatches', async () => {
    const user = userEvent.setup();
    render(<PasswordFormEdit />);

    await user.type(screen.getByLabelText('Current password'), 'currentpass123');
    await user.type(screen.getByLabelText('Confirm current password'), 'differentpass123');
    await user.type(screen.getByLabelText('New password'), 'newpass123');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    await waitFor(() => {
      expect(changePasswordMock).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/no coinciden|match/i)).toBeInTheDocument();
  });

  it('blocks submit when new password is the same as current password', async () => {
    const user = userEvent.setup();
    render(<PasswordFormEdit />);

    await user.type(screen.getByLabelText('Current password'), 'samepass123');
    await user.type(screen.getByLabelText('Confirm current password'), 'samepass123');
    await user.type(screen.getByLabelText('New password'), 'samepass123');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    await waitFor(() => {
      expect(changePasswordMock).not.toHaveBeenCalled();
    });
    expect(screen.getByText('New password must be different')).toBeInTheDocument();
  });

  it('submits valid password change', async () => {
    changePasswordMock.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<PasswordFormEdit />);

    await user.type(screen.getByLabelText('Current password'), 'currentpass123');
    await user.type(screen.getByLabelText('Confirm current password'), 'currentpass123');
    await user.type(screen.getByLabelText('New password'), 'newpass123');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith({
        currentPassword: 'currentpass123',
        newPassword: 'newpass123',
        revokeOtherSessions: false,
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Password updated');
    });
  });
});
