import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './login-form';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => {
        const translations: Record<string, string> = {
            forgotPassword: 'Forgot password?',
            login: 'Login',
            noAccount: "Don't have an account?",
            register: 'Register',
        };
        return translations[key] || key;
    },
}));

// Mock auth-client
const mockSignIn = vi.fn();
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        signIn: {
            email: (...args: unknown[]) => mockSignIn(...args),
        },
    },
}));

// Mock Form components to work with @tanstack/react-form
// The actual Form component expects react-hook-form, but LoginForm uses @tanstack/react-form
// We need to create an adapter that works with @tanstack/react-form
vi.mock('@/components/ui/form', () => {
    // Create a context to pass the tanstack form
    // Tests only: the mocked form surface is intentionally loose.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TanstackFormContext = React.createContext<any>(null);
    // Create a context to pass the field name and errors to FormMessage
    const FormFieldContext = React.createContext({
        name: undefined as string | undefined,
        error: undefined as string | undefined,
    });

    return {
        Form: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
            // The form prop from @tanstack/react-form should be passed here
            // When {...form} is used, all form properties are spread as props
            // The form object properties (useField, handleSubmit, etc.) are in props
            // We'll use props directly as the form object since all form methods are there
            return (
                <TanstackFormContext.Provider value={props}>
                    <div data-testid="form">{children}</div>
                </TanstackFormContext.Provider>
            );
        },
        FormField: ({
            name,
            render,
        }: {
            name: string;
            render: (field: { field: unknown }) => React.ReactNode;
        }) => {
            const form = React.useContext(TanstackFormContext);

            // Fallback: provide a simple field object that works with tanstack form
            const [value, setValue] = React.useState('');

            // If we have a tanstack form, use its useField hook
            if (form && typeof form.useField === 'function') {
                try {
                    // Create a component that provides a context with reactive error
                    const FieldWrapper = () => {
                        // Re-subscribe to field state to get updates
                        const currentField = form.useField({ name });
                        // Get error - it might be a string or an object with a message property
                        const errorObj = currentField.state?.meta?.errors?.[0];
                        const currentError = errorObj
                            ? typeof errorObj === 'string'
                                ? errorObj
                                : errorObj.message || String(errorObj)
                            : undefined;

                        return (
                            <FormFieldContext.Provider value={{ name, error: currentError }}>
                                {render({
                                    field: {
                                        name: currentField.name,
                                        value: currentField.state?.value || '',
                                        onChange: (
                                            e: React.ChangeEvent<HTMLInputElement> | string
                                        ) => {
                                            const nextValue =
                                                typeof e === 'string' ? e : e.target.value;
                                            currentField.handleChange?.(nextValue);
                                        },
                                        onBlur: () => {
                                            currentField.handleBlur?.();
                                        },
                                    },
                                })}
                            </FormFieldContext.Provider>
                        );
                    };

                    return <FieldWrapper />;
                } catch {
                    // Fall through to fallback
                }
            }
            return (
                <FormFieldContext.Provider value={{ name, error: undefined }}>
                    {render({
                        field: {
                            name,
                            value,
                            onChange: (e: React.ChangeEvent<HTMLInputElement> | string) => {
                                const newValue = typeof e === 'string' ? e : e.target.value;
                                setValue(newValue);
                                // Also update the form if it exists
                                form?.setFieldValue?.(name, newValue);
                            },
                            onBlur: () => {},
                        },
                    })}
                </FormFieldContext.Provider>
            );
        },
        FormItem: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
            <div className={className} data-testid="form-item">
                {children}
            </div>
        ),
        FormLabel: ({
            children,
            className,
            htmlFor,
        }: React.PropsWithChildren<{ className?: string; htmlFor?: string }>) => (
            <label className={className} htmlFor={htmlFor} data-testid="form-label">
                {children}
            </label>
        ),
        FormControl: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
            <div data-testid="form-control" {...props}>
                {children}
            </div>
        ),
        FormMessage: ({ children }: React.PropsWithChildren) => {
            const fieldContext = React.useContext(FormFieldContext);
            const form = React.useContext(TanstackFormContext);

            // Try to get error from field context first, then from form directly
            let errorMessage = fieldContext?.error;

            // If no error in context, try to get it directly from the form
            if (
                !errorMessage &&
                form &&
                fieldContext?.name &&
                typeof form.useField === 'function'
            ) {
                try {
                    const field = form.useField({ name: fieldContext.name });
                    const errorObj = field.state?.meta?.errors?.[0];
                    errorMessage = errorObj
                        ? typeof errorObj === 'string'
                            ? errorObj
                            : errorObj.message || String(errorObj)
                        : undefined;
                } catch {
                    // Fall through
                }
            }

            const body = errorMessage || children;
            if (!body) {
                return null;
            }

            return (
                <div data-testid="form-message" data-slot="form-message">
                    {body}
                </div>
            );
        },
    };
});

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSignIn.mockClear();
    });

    it('renders login form', () => {
        render(<LoginForm />);
        // Use data-testid since labels might not be properly associated in the mock
        expect(screen.getByTestId('email-input')).toBeInTheDocument();
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('shows validation error for empty email', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            // Zod shows "Invalid email address" for empty string
            // Look for the specific error message, not the label
            expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        });
    });

    it('shows validation error for invalid email', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const emailInput = screen.getByTestId('email-input');
        await user.type(emailInput, 'invalid-email');

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
        });
    });

    it('shows validation error for empty password', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');

        await user.type(emailInput, 'test@example.com');
        // Touch the password field to trigger validation
        await user.click(passwordInput);
        await user.tab(); // Move focus away to trigger validation

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(
            () => {
                // Zod shows "String must contain at least 8 character(s)" or "Too small" for password < 8 chars
                // Look for any validation error related to password length
                const errorMessage = screen.queryByText(
                    /must contain at least|too small|8 character/i
                );
                expect(errorMessage).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it('calls signIn on valid form submission', async () => {
        const user = userEvent.setup();
        mockSignIn.mockResolvedValue({});

        render(<LoginForm />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith(
                {
                    email: 'test@example.com',
                    password: 'password123',
                },
                expect.any(Object)
            );
        });
    });

    it('redirects to dashboard on successful login', async () => {
        const user = userEvent.setup();
        mockSignIn.mockImplementation((_, { onSuccess }) => {
            onSuccess();
            return Promise.resolve({});
        });

        render(<LoginForm />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/dashboard/home');
        });
    });

    it('displays error message on login failure', async () => {
        const user = userEvent.setup();
        mockSignIn.mockImplementation((_, { onError }) => {
            onError({ error: { message: 'Invalid credentials' } });
            return Promise.resolve({});
        });

        render(<LoginForm />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'wrongpassword');

        const submitButton = screen.getByRole('button', { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
});
