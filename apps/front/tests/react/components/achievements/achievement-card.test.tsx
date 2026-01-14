import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AchievementCard } from '@/components/achievements/achievement-card';
import type { AchievementDefinition } from '@/schemas/achievement';

// Mock the AchievementBadge component
vi.mock('@/components/achievements/achievement-badge', () => ({
    AchievementBadge: ({ name, earned }: { name: string; earned: boolean }) => (
        <div data-testid="achievement-badge" data-earned={earned}>
            {name}
        </div>
    ),
}));

// Mock UI components
vi.mock('@repo/ui/components/card', () => ({
    Card: ({ children, onClick, className, ...props }: any) => (
        <div onClick={onClick} className={className} {...props}>
            {children}
        </div>
    ),
    CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@repo/ui/components/badge', () => ({
    Badge: ({ children, variant }: any) => (
        <span data-testid="badge" data-variant={variant}>
            {children}
        </span>
    ),
}));

vi.mock('@repo/ui/components/progress', () => ({
    Progress: ({ value }: { value: number }) => (
        <div data-testid="progress-bar" data-value={value} role="progressbar" />
    ),
}));

describe('AchievementCard', () => {
    const mockDefinition: AchievementDefinition = {
        _id: 'test-id',
        code: 'first_objective',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        icon: 'Trophy',
        points: 10,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    it('renders earned achievement correctly', () => {
        render(
            <AchievementCard
                definition={mockDefinition}
                isEarned={true}
                currentProgress={1}
                earnedAt={Date.now()}
            />
        );

        // Should show earned status
        expect(screen.getByText('card.earned')).toBeInTheDocument();

        // Should show points
        expect(screen.getByText(/card.points/)).toBeInTheDocument();
    });

    it('renders unearned achievement with progress bar', () => {
        render(
            <AchievementCard
                definition={{ ...mockDefinition, threshold: 10 }}
                isEarned={false}
                currentProgress={5}
            />
        );

        // Should show progress text
        expect(screen.getByText('card.progress')).toBeInTheDocument();
        expect(screen.getByText('5 / 10')).toBeInTheDocument();

        // Should render progress bar
        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('data-value', '50');
    });

    it('displays tier badge', () => {
        render(
            <AchievementCard definition={mockDefinition} isEarned={false} currentProgress={0} />
        );

        // Should show tier badge
        const badges = screen.getAllByTestId('badge');
        expect(badges.length).toBeGreaterThan(0);
    });

    it('calls onClick when card is clicked', () => {
        const handleClick = vi.fn();

        render(
            <AchievementCard definition={mockDefinition} isEarned={true} onClick={handleClick} />
        );

        const card = screen.getByTestId(`achievement-card-${mockDefinition.code}`);
        fireEvent.click(card);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('displays earned date when provided', () => {
        const earnedDate = new Date('2024-01-15').getTime();

        render(
            <AchievementCard definition={mockDefinition} isEarned={true} earnedAt={earnedDate} />
        );

        // Should display formatted date
        expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeInTheDocument();
    });

    it('caps progress at 100%', () => {
        render(
            <AchievementCard
                definition={{ ...mockDefinition, threshold: 5 }}
                isEarned={false}
                currentProgress={10} // Over threshold
            />
        );

        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('data-value', '100');
    });

    it('displays points correctly', () => {
        render(<AchievementCard definition={{ ...mockDefinition, points: 50 }} isEarned={true} />);

        expect(screen.getByText(/card.points/)).toBeInTheDocument();
    });

    it('renders different tier badges correctly', () => {
        const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;

        tiers.forEach(tier => {
            const { unmount } = render(
                <AchievementCard definition={{ ...mockDefinition, tier }} isEarned={true} />
            );

            // Should render without errors
            expect(
                screen.getByTestId(`achievement-card-${mockDefinition.code}`)
            ).toBeInTheDocument();
            unmount();
        });
    });

    it('has reduced opacity when not earned', () => {
        render(
            <AchievementCard definition={mockDefinition} isEarned={false} currentProgress={0} />
        );

        const card = screen.getByTestId(`achievement-card-${mockDefinition.code}`);
        expect(card.className).toContain('opacity-75');
    });

    it('has primary border when earned', () => {
        render(<AchievementCard definition={mockDefinition} isEarned={true} />);

        const card = screen.getByTestId(`achievement-card-${mockDefinition.code}`);
        expect(card.className).toContain('border-primary');
    });

    it('renders with default progress of 0', () => {
        render(
            <AchievementCard definition={{ ...mockDefinition, threshold: 10 }} isEarned={false} />
        );

        expect(screen.getByText('0 / 10')).toBeInTheDocument();
    });
});
