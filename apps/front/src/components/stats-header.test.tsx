import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsHeader from './stats-header';

// Mock @repo/ui components
vi.mock('@repo/ui/components/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card" className={className}>{children}</div>
    ),
    CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card-header" className={className}>{children}</div>
    ),
    CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <h3 data-testid="card-title" className={className}>{children}</h3>
    ),
    CardContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="card-content">{children}</div>
    ),
}));

describe('StatsHeader', () => {
    it('renders three stat cards', () => {
        render(
            <StatsHeader
                totalObjectives={10}
                completedObjectives={7}
                pendingObjectives={3}
            />
        );

        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(3);
    });

    it('displays total objectives value', () => {
        render(
            <StatsHeader
                totalObjectives={25}
                completedObjectives={15}
                pendingObjectives={10}
            />
        );

        expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('displays completed objectives value', () => {
        render(
            <StatsHeader
                totalObjectives={25}
                completedObjectives={15}
                pendingObjectives={10}
            />
        );

        expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('displays pending objectives value', () => {
        render(
            <StatsHeader
                totalObjectives={25}
                completedObjectives={15}
                pendingObjectives={10}
            />
        );

        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders with zero values', () => {
        render(
            <StatsHeader
                totalObjectives={0}
                completedObjectives={0}
                pendingObjectives={0}
            />
        );

        const zeros = screen.getAllByText('0');
        expect(zeros).toHaveLength(3);
    });

    it('renders with large numbers', () => {
        render(
            <StatsHeader
                totalObjectives={1000}
                completedObjectives={500}
                pendingObjectives={500}
            />
        );

        expect(screen.getByText('1000')).toBeInTheDocument();
        expect(screen.getAllByText('500')).toHaveLength(2);
    });

    it('renders translation keys for titles', () => {
        render(
            <StatsHeader
                totalObjectives={10}
                completedObjectives={5}
                pendingObjectives={5}
            />
        );

        // Translation mock returns the key
        expect(screen.getByText('totalObjectives')).toBeInTheDocument();
        expect(screen.getByText('pendingObjectives')).toBeInTheDocument();
    });

    it('has correct grid layout classes', () => {
        const { container } = render(
            <StatsHeader
                totalObjectives={10}
                completedObjectives={5}
                pendingObjectives={5}
            />
        );

        const gridContainer = container.firstChild as HTMLElement;
        expect(gridContainer.className).toContain('grid');
        expect(gridContainer.className).toContain('grid-cols-1');
        expect(gridContainer.className).toContain('md:grid-cols-3');
    });
});
