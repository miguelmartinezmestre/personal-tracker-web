import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

describe('NotFound', () => {
    it('renders the not found page', () => {
        render(<NotFound />);

        // The mock returns the key as the value
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('title');
    });

    it('displays the subtitle', () => {
        render(<NotFound />);

        expect(screen.getByText('subtitle')).toBeInTheDocument();
    });

    it('displays what to do text', () => {
        render(<NotFound />);

        expect(screen.getByText('whatToDo')).toBeInTheDocument();
    });

    it('has a link to home page', () => {
        render(<NotFound />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/');
    });

    it('renders a button with home icon', () => {
        render(<NotFound />);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('goHome');
    });

    it('has correct layout classes', () => {
        const { container } = render(<NotFound />);

        const mainDiv = container.firstChild as HTMLElement;
        expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen');
    });
});
