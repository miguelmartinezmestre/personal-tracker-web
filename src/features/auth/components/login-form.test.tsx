import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './login-form';

const { pushMock, signInEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signInEmailMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const labels: Record<string, string> = {
      'Common.error': 'Error',
      'Common.fields.email': 'Email',
      'Common.fields.password': 'Password',
      'Common.placeholders.email': 'you@example.com',
      'Common.placeholders.password': 'Your password',
      'HomePage.forgotPassword': 'Forgot password?',
      'HomePage.login': 'Log in',
      'HomePage.noAccount': 'No account?',
      'HomePage.register': 'Register',
    };

    return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
  },
}));

vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    signIn: {
      email: signInEmailMock,
    },
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInEmailMock.mockReset();
  });

  it('renders login form fields and links', () => {
    render(<LoginForm />);

    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forget-password'
    );
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
  });

  it('submits valid credentials and redirects on success', async () => {
    signInEmailMock.mockImplementation(async (_payload: unknown, handlers: any) => {
      handlers.onSuccess();
      return {};
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByTestId('email-input'), 'user@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');
    await user.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          password: 'password123',
        },
        expect.any(Object)
      );
      expect(pushMock).toHaveBeenCalledWith('/dashboard/home');
    });
  });

  it('shows error when sign in fails', async () => {
    signInEmailMock.mockImplementation(async (_payload: unknown, handlers: any) => {
      handlers.onError({
        error: {
          message: 'Invalid credentials',
        },
      });
      return {};
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByTestId('email-input'), 'user@example.com');
    await user.type(screen.getByTestId('password-input'), 'wrong-password');
    await user.click(screen.getByTestId('login-button'));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('does not submit empty form', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByTestId('login-button'));

    await waitFor(() => {
      expect(signInEmailMock).not.toHaveBeenCalled();
    });
  });
});
