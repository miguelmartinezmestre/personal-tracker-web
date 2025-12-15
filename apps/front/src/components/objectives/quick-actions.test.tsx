import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickActions } from '@/components/objectives/quick-actions';
import { Id } from '@repo/backend/convex/_generated/dataModel';

// Mock convex functions
vi.mock('@convex-dev/react-query', () => ({
    useConvexMutation: vi.fn(() => vi.fn()),
}));

describe('QuickActions', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
    });

    const renderWithQueryClient = (component: React.ReactElement) => {
        return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
    };

    it('renders all action buttons for in_progress objective', () => {
        const testObjectiveId = "test123" as Id<'objectives'>;
        renderWithQueryClient(<QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />);

        expect(screen.getByTitle('Complete objective')).toBeInTheDocument();
        expect(screen.getByTitle('Pause objective')).toBeInTheDocument();
        expect(screen.getByTitle('Archive objective')).toBeInTheDocument();
        expect(screen.getByTitle('More actions')).toBeInTheDocument();
    });

    it('renders only resume button for paused objective', () => {
        const testObjectiveId = "test123" as Id<'objectives'>;
        renderWithQueryClient(<QuickActions objectiveId={testObjectiveId} currentStatus="paused" />);

        expect(screen.getByTitle('Resume objective')).toBeInTheDocument();
        expect(screen.getByTitle('Archive objective')).toBeInTheDocument();
        expect(screen.queryByTitle('Complete objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Pause objective')).not.toBeInTheDocument();
    });

    it('renders no action buttons for completed objective', () => {
        const testObjectiveId = "test123" as Id<'objectives'>;
        renderWithQueryClient(<QuickActions objectiveId={testObjectiveId} currentStatus="completed" />);

        expect(screen.queryByTitle('Complete objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Pause objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Resume objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Archive objective')).not.toBeInTheDocument();
    });

    it('renders no action buttons for archived objective', () => {
        const testObjectiveId = "test123" as Id<'objectives'>;
        renderWithQueryClient(<QuickActions objectiveId={testObjectiveId} currentStatus="archived" />);

        expect(screen.queryByTitle('Complete objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Pause objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Resume objective')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Archive objective')).not.toBeInTheDocument();
    });

    it('opens dropdown menu when more button is clicked', async () => {
        const testObjectiveId = "test123" as Id<'objectives'>;
        renderWithQueryClient(<QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />);

        const moreButton = screen.getByTitle('More actions');
        fireEvent.click(moreButton);

        await waitFor(() => {
            expect(screen.getByText('Complete')).toBeInTheDocument();
            expect(screen.getByText('Pause')).toBeInTheDocument();
            expect(screen.getByText('Archive')).toBeInTheDocument();
        });
    });
});