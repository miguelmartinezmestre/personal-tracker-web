import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountSettingsFormEdit from './account-settings-form-edit';

const { sessionState, updateUserMock, changeEmailMock } = vi.hoisted(() => ({
  sessionState: {
    isPending: false,
    data: {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
  } as {
    isPending: boolean;
    data?: {
      user?: {
        name?: string;
        email?: string;
      };
    };
  },
  updateUserMock: vi.fn(),
  changeEmailMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const labels: Record<string, string> = {
      'Settings.username': 'Username',
      'Settings.email': 'Email',
      'Settings.cancel': 'Cancel',
      'Settings.saveAccount': 'Save account',
      'Settings.accountUpdated': 'Account updated',
      'Settings.emailChangeRequested': 'Email change requested',
      'Settings.placeholders.enterUsername': 'Enter username',
      'Settings.placeholders.enterEmail': 'Enter email',
      'Common.genericErrorDescription': 'Something went wrong',
    };

    return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
  },
}));

vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    useSession: () => sessionState,
    updateUser: updateUserMock,
    changeEmail: changeEmailMock,
  },
}));

describe('AccountSettingsFormEdit', () => {
  beforeEach(() => {
    sessionState.isPending = false;
    sessionState.data = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    };
    updateUserMock.mockReset();
    changeEmailMock.mockReset();
    updateUserMock.mockResolvedValue({ error: null });
    changeEmailMock.mockResolvedValue({ error: null });
  });

  it('updates username when it changes and keeps same email', async () => {
    const user = userEvent.setup();
    render(<AccountSettingsFormEdit />);

    const usernameInput = await screen.findByLabelText('Username');
    const emailInput = await screen.findByLabelText('Email');

    await user.clear(usernameInput);
    await user.type(usernameInput, 'Johnny');
    await user.clear(emailInput);
    await user.type(emailInput, 'john@example.com');
    await user.click(screen.getByRole('button', { name: 'Save account' }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ name: 'Johnny' });
      expect(changeEmailMock).not.toHaveBeenCalled();
    });
    expect(await screen.findByText('Account updated')).toBeInTheDocument();
  });

  it('requests email change when email is updated', async () => {
    const user = userEvent.setup();
    render(<AccountSettingsFormEdit />);

    const emailInput = await screen.findByLabelText('Email');

    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Save account' }));

    await waitFor(() => {
      expect(changeEmailMock).toHaveBeenCalledWith({
        newEmail: 'new@example.com',
        callbackURL: '/dashboard/settings',
      });
    });
    expect(await screen.findByText('Email change requested')).toBeInTheDocument();
  });

  it('shows error when no session user is available', async () => {
    sessionState.data = {};

    const user = userEvent.setup();
    render(<AccountSettingsFormEdit />);

    await user.type(screen.getByLabelText('Username'), 'John');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');

    await user.click(screen.getByRole('button', { name: 'Save account' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
