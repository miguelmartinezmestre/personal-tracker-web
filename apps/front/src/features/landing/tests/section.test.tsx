import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Section from '@/features/landing/section';

describe('Section', () => {
    it('renders with title and content', () => {
        render(<Section title="Test Title" content="Test content paragraph" />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Title');
        expect(screen.getByText('Test content paragraph')).toBeInTheDocument();
    });

    it('renders the title as h2 element', () => {
        render(<Section title="My Section" content="Some content" />);

        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading.tagName).toBe('H2');
    });

    it('applies correct CSS classes', () => {
        const { container } = render(<Section title="Title" content="Content" />);

        const section = container.querySelector('section');
        expect(section).toHaveClass('mb-8');

        const heading = container.querySelector('h2');
        expect(heading).toHaveClass('text-2xl', 'font-bold', 'mb-4');

        const paragraph = container.querySelector('p');
        expect(paragraph).toHaveClass('text-gray-600');
    });

    it('renders empty strings without crashing', () => {
        render(<Section title="" content="" />);

        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent('');
    });

    it('renders special characters correctly', () => {
        render(
            <Section
                title="Special <characters> & symbols"
                content={'Content with \'quotes\' and "double quotes"'}
            />
        );

        expect(screen.getByText('Special <characters> & symbols')).toBeInTheDocument();
        expect(screen.getByText('Content with \'quotes\' and "double quotes"')).toBeInTheDocument();
    });

    it('renders long content properly', () => {
        const longContent = 'A'.repeat(1000);
        render(<Section title="Long Content" content={longContent} />);

        expect(screen.getByText(longContent)).toBeInTheDocument();
    });
});
