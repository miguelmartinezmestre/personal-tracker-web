import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusIndicator } from '@repo/ui/components/status-indicator';

describe('StatusIndicator', () => {
    it('renders completed status', () => {
        render(<StatusIndicator status="completed" />);

        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toHaveClass('bg-green-500');
    });

    it('renders in progress status with good progress', () => {
        render(<StatusIndicator status="in_progress" currentValue={75} targetValue={100} />);

        expect(screen.getByText('On Track')).toBeInTheDocument();
        expect(screen.getByText('On Track')).toHaveClass('bg-green-500');
    });

    it('renders in progress status with at risk progress', () => {
        render(<StatusIndicator status="in_progress" currentValue={25} targetValue={100} />);

        expect(screen.getByText('At Risk')).toBeInTheDocument();
        expect(screen.getByText('At Risk')).toHaveClass('bg-orange-500');
    });

    it('renders overdue status', () => {
        const pastDate = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago
        render(<StatusIndicator status="in_progress" deadline={pastDate} />);

        expect(screen.getByText('Overdue')).toBeInTheDocument();
        expect(screen.getByText('Overdue')).toHaveClass('bg-red-500');
    });

    it('renders paused status', () => {
        render(<StatusIndicator status="paused" />);

        expect(screen.getByText('Paused')).toBeInTheDocument();
        expect(screen.getByText('Paused')).toHaveClass('bg-gray-500');
    });

    it('renders archived status', () => {
        render(<StatusIndicator status="archived" />);

        expect(screen.getByText('Archived')).toBeInTheDocument();
        expect(screen.getByText('Archived')).toHaveClass('bg-gray-400');
    });

    it('handles unknown status', () => {
        render(<StatusIndicator status="unknown" />);

        expect(screen.getByText('unknown')).toBeInTheDocument();
        expect(screen.getByText('unknown')).toHaveClass('bg-gray-500');
    });
});
