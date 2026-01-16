import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AchievementCard } from '@/features/achievements/components/achievement-card';
import type { AchievementDefinition } from '@/features/achievements/schemas/achievement';

vi.mock('@/components/achievements/achievement-badge', () => ({
    AchievementBadge: ({ name, earned }: { name: string; earned: boolean }) => (
        <div data-testid="achievement-badge" data-earned={earned}>
            {name}
        </div>
    ),
}));

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

    it('renders earned achievement with status and points', () => {
        render(
            <AchievementCard
                definition={mockDefinition}
                isEarned={true}
                currentProgress={1}
                earnedAt={Date.now()}
            />
        );

        expect(screen.getByText('card.earned')).toBeInTheDocument();
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

        expect(screen.getByText('card.progress')).toBeInTheDocument();
        expect(screen.getByText('5 / 10')).toBeInTheDocument();

        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('data-value', '50');
    });

    it('caps progress at 100% when over threshold', () => {
        render(
            <AchievementCard
                definition={{ ...mockDefinition, threshold: 5 }}
                isEarned={false}
                currentProgress={10}
            />
        );

        expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', '100');
    });

    it('displays formatted earned date', () => {
        const earnedDate = new Date('2024-01-15').getTime();
        render(
            <AchievementCard definition={mockDefinition} isEarned={true} earnedAt={earnedDate} />
        );

        expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', () => {
        const handleClick = vi.fn();
        render(
            <AchievementCard definition={mockDefinition} isEarned={true} onClick={handleClick} />
        );

        fireEvent.click(screen.getByTestId(`achievement-card-${mockDefinition.code}`));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders all tier variants without errors', () => {
        const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;

        tiers.forEach(tier => {
            const { unmount } = render(
                <AchievementCard definition={{ ...mockDefinition, tier }} isEarned={true} />
            );
            expect(
                screen.getByTestId(`achievement-card-${mockDefinition.code}`)
            ).toBeInTheDocument();
            unmount();
        });
    });
});
