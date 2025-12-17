import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CircularProgress } from '@repo/ui/components/circular-progress';

describe('CircularProgress', () => {
    it('renders with default props', () => {
        render(<CircularProgress value={50} max={100} />);

        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
        const { rerender } = render(<CircularProgress value={30} max={100} size="sm" />);
        expect(screen.getByRole('progressbar')).toHaveClass('w-8', 'h-8');

        rerender(<CircularProgress value={30} max={100} size="lg" />);
        expect(screen.getByRole('progressbar')).toHaveClass('w-16', 'h-16');
    });

    it('hides percentage when showValue is false', () => {
        render(<CircularProgress value={75} max={100} showValue={false} />);

        expect(screen.queryByText('75%')).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('calculates percentage correctly', () => {
        render(<CircularProgress value={25} max={50} />);

        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('handles edge cases', () => {
        render(<CircularProgress value={150} max={100} />);

        expect(screen.getByText('100%')).toBeInTheDocument();
    });
});
