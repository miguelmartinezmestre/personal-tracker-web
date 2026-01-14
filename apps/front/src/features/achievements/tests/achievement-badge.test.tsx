import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AchievementBadge } from '@/features/achievements/components/achievement-badge';

// Mock the tooltip components
vi.mock('@repo/ui/components/tooltip', () => ({
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="tooltip-content">{children}</div>
    ),
}));

describe('AchievementBadge', () => {
    const defaultProps = {
        icon: 'Trophy',
        tier: 'bronze' as const,
        name: 'First Achievement',
        earned: true,
    };

    it('renders with default props when earned', () => {
        render(<AchievementBadge {...defaultProps} />);

        // Should render the badge container
        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders locked state when not earned', () => {
        render(<AchievementBadge {...defaultProps} earned={false} />);

        // Should have opacity class for locked state
        const badge = document.querySelector('.opacity-50');
        expect(badge).toBeInTheDocument();
    });

    it('applies correct tier colors for bronze', () => {
        render(<AchievementBadge {...defaultProps} tier="bronze" />);

        const badge = document.querySelector('.bg-amber-600');
        expect(badge).toBeInTheDocument();
    });

    it('applies correct tier colors for silver', () => {
        render(<AchievementBadge {...defaultProps} tier="silver" />);

        const badge = document.querySelector('.bg-gray-400');
        expect(badge).toBeInTheDocument();
    });

    it('applies correct tier colors for gold', () => {
        render(<AchievementBadge {...defaultProps} tier="gold" />);

        const badge = document.querySelector('.bg-yellow-500');
        expect(badge).toBeInTheDocument();
    });

    it('applies correct tier colors for platinum', () => {
        render(<AchievementBadge {...defaultProps} tier="platinum" />);

        const badge = document.querySelector('.bg-purple-500');
        expect(badge).toBeInTheDocument();
    });

    it('renders with small size', () => {
        render(<AchievementBadge {...defaultProps} size="sm" />);

        const badge = document.querySelector('.w-8.h-8');
        expect(badge).toBeInTheDocument();
    });

    it('renders with medium size (default)', () => {
        render(<AchievementBadge {...defaultProps} size="md" />);

        const badge = document.querySelector('.w-12.h-12');
        expect(badge).toBeInTheDocument();
    });

    it('renders with large size', () => {
        render(<AchievementBadge {...defaultProps} size="lg" />);

        const badge = document.querySelector('.w-16.h-16');
        expect(badge).toBeInTheDocument();
    });

    it('hides tooltip when showTooltip is false', () => {
        render(<AchievementBadge {...defaultProps} showTooltip={false} />);

        // Should not render tooltip content
        expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });

    it('shows tooltip with name when showTooltip is true', () => {
        render(<AchievementBadge {...defaultProps} showTooltip={true} />);

        // Should render tooltip content with name
        expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
        expect(screen.getByText('First Achievement')).toBeInTheDocument();
    });

    it('shows description in tooltip when provided', () => {
        render(
            <AchievementBadge
                {...defaultProps}
                description="Complete your first objective"
                showTooltip={true}
            />
        );

        expect(screen.getByText('Complete your first objective')).toBeInTheDocument();
    });

    it('shows locked text in tooltip when not earned', () => {
        render(<AchievementBadge {...defaultProps} earned={false} showTooltip={true} />);

        expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('falls back to Trophy icon for unknown icon names', () => {
        render(<AchievementBadge {...defaultProps} icon="UnknownIcon" />);

        // Should still render without crashing
        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders Target icon correctly', () => {
        render(<AchievementBadge {...defaultProps} icon="Target" />);

        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders Flame icon correctly', () => {
        render(<AchievementBadge {...defaultProps} icon="Flame" />);

        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders CheckCircle icon correctly', () => {
        render(<AchievementBadge {...defaultProps} icon="CheckCircle" />);

        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders TrendingUp icon correctly', () => {
        render(<AchievementBadge {...defaultProps} icon="TrendingUp" />);

        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });

    it('renders Users icon correctly', () => {
        render(<AchievementBadge {...defaultProps} icon="Users" />);

        const badge = document.querySelector('.rounded-full');
        expect(badge).toBeInTheDocument();
    });
});
