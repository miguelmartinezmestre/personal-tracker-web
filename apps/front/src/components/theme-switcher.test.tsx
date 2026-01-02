import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './theme-switcher';

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
    useTheme: () => ({
        setTheme: mockSetTheme,
        theme: 'light',
    }),
}));

// Mock @repo/ui components
vi.mock('@repo/ui/components/button', () => ({
    Button: ({ children, variant, size, ...props }: { children: React.ReactNode; variant?: string; size?: string; [key: string]: any }) => (
        <button data-testid="theme-button" data-variant={variant} data-size={size} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@repo/ui/components/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dropdown-menu">{children}</div>
    ),
    DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => (
        <div data-testid="dropdown-content" data-align={align}>{children}</div>
    ),
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
    ),
    DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
        <div data-testid="dropdown-trigger" data-as-child={asChild}>{children}</div>
    ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Moon: ({ className }: { className?: string }) => <svg data-testid="moon-icon" className={className} />,
    Sun: ({ className }: { className?: string }) => <svg data-testid="sun-icon" className={className} />,
}));

describe('ThemeToggle', () => {
    beforeEach(() => {
        mockSetTheme.mockClear();
    });

    it('renders the dropdown menu', () => {
        render(<ThemeToggle />);

        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('renders the trigger button', () => {
        render(<ThemeToggle />);

        expect(screen.getByTestId('theme-button')).toBeInTheDocument();
    });

    it('renders sun and moon icons', () => {
        render(<ThemeToggle />);

        expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
        expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });

    it('renders sr-only text for accessibility', () => {
        render(<ThemeToggle />);

        const srOnlyText = screen.getByText('toggle');
        expect(srOnlyText).toHaveClass('sr-only');
    });

    it('renders light theme option', () => {
        render(<ThemeToggle />);

        expect(screen.getByText('light')).toBeInTheDocument();
    });

    it('renders dark theme option', () => {
        render(<ThemeToggle />);

        expect(screen.getByText('dark')).toBeInTheDocument();
    });

    it('renders system theme option', () => {
        render(<ThemeToggle />);

        expect(screen.getByText('system')).toBeInTheDocument();
    });

    it('calls setTheme with light when light option is clicked', () => {
        render(<ThemeToggle />);

        const lightOption = screen.getByText('light');
        fireEvent.click(lightOption);

        expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('calls setTheme with dark when dark option is clicked', () => {
        render(<ThemeToggle />);

        const darkOption = screen.getByText('dark');
        fireEvent.click(darkOption);

        expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('calls setTheme with system when system option is clicked', () => {
        render(<ThemeToggle />);

        const systemOption = screen.getByText('system');
        fireEvent.click(systemOption);

        expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('renders button with outline variant', () => {
        render(<ThemeToggle />);

        const button = screen.getByTestId('theme-button');
        expect(button).toHaveAttribute('data-variant', 'outline');
    });

    it('renders button with icon size', () => {
        render(<ThemeToggle />);

        const button = screen.getByTestId('theme-button');
        expect(button).toHaveAttribute('data-size', 'icon');
    });

    it('renders dropdown content aligned to end', () => {
        render(<ThemeToggle />);

        const content = screen.getByTestId('dropdown-content');
        expect(content).toHaveAttribute('data-align', 'end');
    });

    it('has three theme options', () => {
        render(<ThemeToggle />);

        const items = screen.getAllByTestId('dropdown-item');
        expect(items).toHaveLength(3);
    });
});
