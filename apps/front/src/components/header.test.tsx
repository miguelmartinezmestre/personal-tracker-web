import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './header';

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

// Mock NavBar component
vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">NavBar</nav>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    X: ({ className }: { className?: string }) => (
        <svg data-testid="x-icon" className={className} />
    ),
    Menu: ({ className }: { className?: string }) => (
        <svg data-testid="menu-icon" className={className} />
    ),
}));

describe('Header', () => {
    it('renders the header element', () => {
        render(<Header />);

        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders the app name link', () => {
        render(<Header />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/');
        expect(link).toHaveTextContent('appName');
    });

    it('renders the desktop navbar', () => {
        render(<Header />);

        const navbars = screen.getAllByTestId('navbar');
        expect(navbars.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the mobile menu button', () => {
        render(<Header />);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
    });

    it('shows menu icon when menu is closed', () => {
        render(<Header />);

        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('shows X icon when menu is open', () => {
        render(<Header />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('toggles mobile menu on button click', () => {
        render(<Header />);

        const button = screen.getByRole('button');

        // Initially shows menu icon
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();

        // Click to open
        fireEvent.click(button);
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();

        // Click to close
        fireEvent.click(button);
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('shows mobile navbar when menu is open', () => {
        render(<Header />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        // Should have 2 navbars - desktop and mobile
        const navbars = screen.getAllByTestId('navbar');
        expect(navbars).toHaveLength(2);
    });

    it('hides mobile navbar when menu is closed', () => {
        render(<Header />);

        // Initially only desktop navbar visible
        const navbars = screen.getAllByTestId('navbar');
        expect(navbars).toHaveLength(1);
    });

    it('has correct aria-label when menu is closed', () => {
        render(<Header />);

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'aria.openMenu');
    });

    it('has correct aria-label when menu is open', () => {
        render(<Header />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(button).toHaveAttribute('aria-label', 'aria.closeMenu');
    });

    it('has correct styling classes', () => {
        render(<Header />);

        const header = screen.getByRole('banner');
        expect(header.className).toContain('sticky');
        expect(header.className).toContain('top-0');
        expect(header.className).toContain('z-10');
    });

    it('renders link with prefetch disabled', () => {
        render(<Header />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('data-prefetch', 'false');
    });

    it('renders link with correct styling', () => {
        render(<Header />);

        const link = screen.getByRole('link');
        expect(link.className).toContain('text-xl');
        expect(link.className).toContain('font-bold');
    });
});
