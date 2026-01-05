import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchForm } from './search-form';

// Mock next-intl
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock @repo/ui components
vi.mock('@repo/ui/components/label', () => ({
    Label: ({
        children,
        htmlFor,
        className,
    }: {
        children: React.ReactNode;
        htmlFor?: string;
        className?: string;
    }) => (
        <label data-testid="label" htmlFor={htmlFor} className={className}>
            {children}
        </label>
    ),
}));

vi.mock('@repo/ui/components/sidebar', () => ({
    SidebarGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="sidebar-group" className={className}>
            {children}
        </div>
    ),
    SidebarGroupContent: ({
        children,
        className,
    }: {
        children: React.ReactNode;
        className?: string;
    }) => (
        <div data-testid="sidebar-group-content" className={className}>
            {children}
        </div>
    ),
    SidebarInput: ({
        id,
        placeholder,
        className,
    }: {
        id?: string;
        placeholder?: string;
        className?: string;
    }) => (
        <input
            data-testid="sidebar-input"
            id={id}
            placeholder={placeholder}
            className={className}
        />
    ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Search: ({ className }: { className?: string }) => (
        <svg data-testid="search-icon" className={className} />
    ),
}));

describe('SearchForm', () => {
    it('renders the form element', () => {
        render(<SearchForm />);

        const form = document.querySelector('form');
        expect(form).toBeInTheDocument();
    });

    it('renders the search input', () => {
        render(<SearchForm />);

        expect(screen.getByTestId('sidebar-input')).toBeInTheDocument();
    });

    it('renders the search label with sr-only class', () => {
        render(<SearchForm />);

        const label = screen.getByTestId('label');
        expect(label).toHaveClass('sr-only');
    });

    it('renders the search icon', () => {
        render(<SearchForm />);

        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('passes props to the form element', () => {
        const onSubmit = vi.fn(e => e.preventDefault());
        render(<SearchForm onSubmit={onSubmit} className="custom-class" />);

        const form = document.querySelector('form');
        expect(form).toHaveClass('custom-class');
    });

    it('renders input with placeholder translation key', () => {
        render(<SearchForm />);

        const input = screen.getByTestId('sidebar-input');
        expect(input).toHaveAttribute('placeholder', 'placeholders.searchDocs');
    });

    it('renders input with correct id', () => {
        render(<SearchForm />);

        const input = screen.getByTestId('sidebar-input');
        expect(input).toHaveAttribute('id', 'search');
    });

    it('renders label with correct htmlFor attribute', () => {
        render(<SearchForm />);

        const label = screen.getByTestId('label');
        expect(label).toHaveAttribute('for', 'search');
    });

    it('renders label with search translation key', () => {
        render(<SearchForm />);

        const label = screen.getByTestId('label');
        expect(label).toHaveTextContent('search');
    });

    it('applies correct positioning classes to search icon', () => {
        render(<SearchForm />);

        const icon = screen.getByTestId('search-icon');
        expect(icon).toHaveClass('absolute', 'left-2');
    });

    it('renders within sidebar group structure', () => {
        render(<SearchForm />);

        expect(screen.getByTestId('sidebar-group')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar-group-content')).toBeInTheDocument();
    });
});
