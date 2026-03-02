import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SettingsLayout from './settings-layout';

vi.mock('./account-settings-form-edit', () => ({
  default: () => <div data-testid="settings-account-form">Account form</div>,
}));

vi.mock('./password-form-edit', () => ({
  default: () => <div data-testid="settings-password-form">Password form</div>,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      title: 'Settings',
      description: 'Manage your preferences',
      account: 'Account',
      password: 'Password',
      accountSettings: 'Account settings',
      accountSettingsDescription: 'Update your profile',
      passwordSettings: 'Password settings',
      passwordSettingsDescription: 'Change your password',
    };

    return labels[key] ?? key;
  },
}));

describe('SettingsLayout', () => {
  it('renders settings heading and default account tab', () => {
    render(<SettingsLayout />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Password' })).toBeInTheDocument();
    expect(screen.getByTestId('settings-account-form')).toBeInTheDocument();
  });

  it('switches to password tab', async () => {
    const user = userEvent.setup();
    render(<SettingsLayout />);

    await user.click(screen.getByRole('tab', { name: 'Password' }));

    expect(screen.getByTestId('settings-password-form')).toBeInTheDocument();
  });
});
