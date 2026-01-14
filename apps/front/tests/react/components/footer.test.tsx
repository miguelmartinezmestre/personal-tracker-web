import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './footer';

// Mock next-intl is already set up in vitest.setup.ts

describe('Footer', () => {
    it('renders the footer element', () => {
        render(<Footer />);

        const footer = screen.getByRole('contentinfo');
        expect(footer).toBeInTheDocument();
    });

    it('displays the current year', () => {
        render(<Footer />);

        const currentYear = new Date().getFullYear().toString();
        expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    });

    it('displays the app title translation key', () => {
        render(<Footer />);

        // The mock returns the key as the value
        expect(screen.getByText(/title/)).toBeInTheDocument();
    });

    it('has correct CSS classes', () => {
        render(<Footer />);

        const footer = screen.getByRole('contentinfo');
        expect(footer).toHaveClass('text-primary', 'border-t', 'border-gray-200');
    });

    it('contains a container div', () => {
        const { container } = render(<Footer />);

        const containerDiv = container.querySelector('.container');
        expect(containerDiv).toBeInTheDocument();
        expect(containerDiv).toHaveClass('mx-auto', 'px-4', 'py-6');
    });
});
