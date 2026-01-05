import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NavBar from './navbar';

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        className,
        prefetch,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
        prefetch?: boolean;
    }) => (
        <a href={href} className={className} data-prefetch={prefetch?.toString()}>
            {children}
        </a>
    ),
}));

// Mock theme-switcher
vi.mock('@/components/theme-switcher', () => ({
    ThemeToggle: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

// Mock language-switcher
vi.mock('./language-switcher', () => ({
    LanguageSwitcher: () => <button data-testid="language-switcher">Language Switcher</button>,
}));

// Mock auth-client session
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        useSession: () => ({
            data: { user: { id: 'test-user', email: 'test@example.com', name: 'Test' } },
            isPending: false,
        }),
    },
}));

describe('NavBar', () => {
    it('renders the navbar container', () => {
        render(<NavBar />);

        const container = document.querySelector('.flex');
        expect(container).toBeInTheDocument();
    });

    it('renders register link', () => {
        render(<NavBar />);

        const registerLink = screen.getByText('register');
        expect(registerLink).toBeInTheDocument();
        expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('renders login link', () => {
        render(<NavBar />);

        const loginLink = screen.getByText('login');
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('renders theme toggle', () => {
        render(<NavBar />);

        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('renders language switcher', () => {
        render(<NavBar />);

        expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('renders authenticated section with dashboard link', () => {
        render(<NavBar />);

        const dashboardLink = screen.getByText('goToDashboard');
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink).toHaveAttribute('href', '/dashboard/home');
    });

    it('renders links with correct styling', () => {
        render(<NavBar />);

        const registerLink = screen.getByText('register');
        expect(registerLink.className).toContain('text-primary');
        expect(registerLink.className).toContain('hover:text-gray-700');
    });

    it('renders links with prefetch disabled', () => {
        render(<NavBar />);

        const registerLink = screen.getByText('register');
        expect(registerLink).toHaveAttribute('data-prefetch', 'false');
    });

    it('has correct layout classes', () => {
        const { container } = render(<NavBar />);

        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('flex');
        expect(wrapper.className).toContain('flex-col');
        expect(wrapper.className).toContain('lg:flex-row');
    });
});
