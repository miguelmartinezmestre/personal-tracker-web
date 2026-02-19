import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterForm from './register-form';

const {
    pushMock,
    signUpEmailMock,
    organizationAcceptInvitationMock,
    organizationListMock,
    organizationSetActiveMock,
    organizationCreateMock,
    invitationTokenState,
} = vi.hoisted(() => ({
    pushMock: vi.fn(),
    signUpEmailMock: vi.fn(),
    organizationAcceptInvitationMock: vi.fn(),
    organizationListMock: vi.fn(),
    organizationSetActiveMock: vi.fn(),
    organizationCreateMock: vi.fn(),
    invitationTokenState: { value: null as string | null },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
    useSearchParams: () => ({
        get: (key: string) => {
            if (key === 'invitation') {
                return invitationTokenState.value;
            }

            return null;
        },
    }),
}));

vi.mock('next-intl', () => ({
    useTranslations: (namespace: string) => (key: string) => {
        const labels: Record<string, string> = {
            'Common.error': 'Error',
            'Common.loading': 'Loading',
            'Common.fields.username': 'Username',
            'Common.fields.email': 'Email',
            'Common.fields.password': 'Password',
            'Common.fields.confirmPassword': 'Confirm password',
            'Common.fields.organizationSlug': 'Organization slug',
            'Common.fields.organizationSlugHint': 'Only lowercase letters, numbers and hyphens',
            'Common.placeholders.username': 'john-doe',
            'Common.placeholders.email': 'john@example.com',
            'Common.placeholders.min8Chars': 'At least 8 characters',
            'Common.placeholders.confirmPassword': 'Repeat your password',
            'Common.placeholders.organizationSlug': 'my-org',
            'HomePage.register': 'Register',
            'HomePage.login': 'Log in',
            'HomePage.alreadyHaveAccount': 'Already have an account?',
            'HomePage.errors.registerFallback': 'Register failed',
        };

        return labels[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    },
}));

vi.mock('@/features/auth/auth-client', () => ({
    authClient: {
        signUp: {
            email: signUpEmailMock,
        },
        organization: {
            acceptInvitation: organizationAcceptInvitationMock,
            list: organizationListMock,
            setActive: organizationSetActiveMock,
            create: organizationCreateMock,
        },
    },
}));

describe('RegisterForm', () => {
    beforeEach(() => {
        invitationTokenState.value = null;
        pushMock.mockReset();
        signUpEmailMock.mockReset();
        organizationAcceptInvitationMock.mockReset();
        organizationListMock.mockReset();
        organizationSetActiveMock.mockReset();
        organizationCreateMock.mockReset();
    });

    it('shows organization slug field when there is no invitation token', () => {
        render(<RegisterForm />);

        expect(screen.getByTestId('register-organization-slug-input')).toBeInTheDocument();
    });

    it('hides organization slug field when invitation token is present', () => {
        invitationTokenState.value = 'inv_123';
        render(<RegisterForm />);

        expect(screen.queryByTestId('register-organization-slug-input')).not.toBeInTheDocument();
    });

    it('does not submit when organization slug is missing without invitation token', async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        await user.type(screen.getByTestId('register-username-input'), 'john-doe');
        await user.type(screen.getByTestId('register-email-input'), 'john@example.com');
        await user.type(screen.getByTestId('register-password-input'), 'password123');
        await user.type(screen.getByTestId('register-confirm-password-input'), 'password123');
        await user.click(screen.getByTestId('register-button'));

        await waitFor(() => {
            expect(signUpEmailMock).not.toHaveBeenCalled();
        });
        expect(screen.getByTestId('register-organization-slug-input')).toBeInTheDocument();
    });

    it('registers and creates organization when no invitation token is present', async () => {
        signUpEmailMock.mockImplementation(async (_payload: unknown, handlers: any) => {
            await handlers.onSuccess();
            return {};
        });
        organizationCreateMock.mockResolvedValue({ data: { id: 'org_1' } });
        organizationSetActiveMock.mockResolvedValue({});

        const user = userEvent.setup();
        render(<RegisterForm />);

        await user.type(screen.getByTestId('register-username-input'), 'john-doe');
        await user.type(screen.getByTestId('register-email-input'), 'john@example.com');
        await user.type(screen.getByTestId('register-password-input'), 'password123');
        await user.type(screen.getByTestId('register-confirm-password-input'), 'password123');
        await user.type(screen.getByTestId('register-organization-slug-input'), 'acme-org');
        await user.click(screen.getByTestId('register-button'));

        await waitFor(() => {
            expect(signUpEmailMock).toHaveBeenCalled();
            expect(organizationCreateMock).toHaveBeenCalledWith({
                name: "john-doe's Organization",
                slug: 'acme-org',
            });
            expect(organizationSetActiveMock).toHaveBeenCalledWith({
                organizationId: 'org_1',
            });
            expect(pushMock).toHaveBeenCalledWith('/dashboard/home');
        });
    });

    it('accepts invitation and sets active organization when invitation token exists', async () => {
        invitationTokenState.value = 'invite_abc';
        signUpEmailMock.mockImplementation(async (_payload: unknown, handlers: any) => {
            await handlers.onSuccess();
            return {};
        });
        organizationListMock.mockResolvedValue({ data: [{ id: 'org_invited' }] });
        organizationSetActiveMock.mockResolvedValue({});

        const user = userEvent.setup();
        render(<RegisterForm />);

        await user.type(screen.getByTestId('register-username-input'), 'john-doe');
        await user.type(screen.getByTestId('register-email-input'), 'john@example.com');
        await user.type(screen.getByTestId('register-password-input'), 'password123');
        await user.type(screen.getByTestId('register-confirm-password-input'), 'password123');
        await user.click(screen.getByTestId('register-button'));

        await waitFor(() => {
            expect(organizationAcceptInvitationMock).toHaveBeenCalledWith({
                invitationId: 'invite_abc',
            });
            expect(organizationCreateMock).not.toHaveBeenCalled();
            expect(organizationSetActiveMock).toHaveBeenCalledWith({
                organizationId: 'org_invited',
            });
            expect(pushMock).toHaveBeenCalledWith('/dashboard/home');
        });
    });
});
