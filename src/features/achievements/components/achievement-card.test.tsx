import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AchievementCard } from './achievement-card';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, string | number>) => {
        const labels: Record<string, string> = {
            'card.earned': 'Earned',
            'card.progress': 'Progress',
            'tiers.bronze': 'Bronze',
            'tiers.silver': 'Silver',
            'tiers.gold': 'Gold',
            'tiers.platinum': 'Platinum',
        };

        if (key.startsWith('definitions.') && key.endsWith('.name')) {
            return 'First objective';
        }

        if (key.startsWith('definitions.') && key.endsWith('.description')) {
            return `Reach ${values?.threshold}`;
        }

        if (key === 'card.points') {
            return `${values?.points} pts`;
        }

        return labels[key] ?? key;
    },
}));

const definition = {
    _id: 'ach_1',
    code: 'first_objective',
    type: 'individual',
    category: 'milestone',
    tier: 'bronze',
    threshold: 10,
    icon: 'trophy',
    points: 50,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
} as const;

describe('AchievementCard', () => {
    it('renders progress state for locked achievements', () => {
        render(
            <AchievementCard
                definition={definition}
                currentProgress={4}
                isEarned={false}
                onClick={vi.fn()}
            />
        );

        expect(screen.getByText('First objective')).toBeInTheDocument();
        expect(screen.getByText('Progress')).toBeInTheDocument();
        expect(screen.getByText('4 / 10')).toBeInTheDocument();
        expect(screen.getByText('50 pts')).toBeInTheDocument();
    });

    it('renders earned state for completed achievements', () => {
        render(
            <AchievementCard
                definition={definition}
                currentProgress={10}
                isEarned={true}
                earnedAt={1700000000000}
            />
        );

        expect(screen.getByText('Earned')).toBeInTheDocument();
    });

    it('triggers onClick when card is clicked', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();

        render(
            <AchievementCard
                definition={definition}
                currentProgress={4}
                isEarned={false}
                onClick={onClick}
            />
        );

        await user.click(screen.getByTestId('achievement-card-first_objective'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
