import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickActions } from '@/features/objectives/quick-actions';
import { Id } from '@repo/backend/convex/_generated/dataModel';

const objectiveMutations = vi.hoisted(() => ({
    complete: vi.fn(),
    pause: vi.fn(),
    archive: vi.fn(),
    resume: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
}));

// Mock convex functions
vi.mock('@convex-dev/react-query', () => ({
    useConvexMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/api/use-objectives', () => ({
    useCompleteObjective: () => ({ mutate: objectiveMutations.complete, isPending: false }),
    usePauseObjective: () => ({ mutate: objectiveMutations.pause, isPending: false }),
    useArchiveObjective: () => ({ mutate: objectiveMutations.archive, isPending: false }),
    useUpdateObjectiveStatus: () => ({ mutate: objectiveMutations.resume, isPending: false }),
}));

vi.mock('@repo/ui/components/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
    ),
}));

vi.mock('@repo/ui/components/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
        children,
        onClick,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
    }) => <div onClick={onClick}>{children}</div>,
}));

vi.mock('sonner', () => ({
    toast: {
        success: toastMocks.success,
        error: toastMocks.error,
    },
}));

describe('QuickActions', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        objectiveMutations.complete.mockReset();
        objectiveMutations.pause.mockReset();
        objectiveMutations.archive.mockReset();
        objectiveMutations.resume.mockReset();
        toastMocks.success.mockReset();
        toastMocks.error.mockReset();
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
        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />
        );

        expect(screen.getByTitle('tooltips.complete')).toBeInTheDocument();
        expect(screen.getByTitle('tooltips.pause')).toBeInTheDocument();
        expect(screen.getByTitle('tooltips.archive')).toBeInTheDocument();
        expect(screen.getByTitle('tooltips.more')).toBeInTheDocument();
    });

    it('renders only resume button for paused objective', () => {
        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="paused" />
        );

        expect(screen.getByTitle('tooltips.resume')).toBeInTheDocument();
        expect(screen.getByTitle('tooltips.archive')).toBeInTheDocument();
        expect(screen.getByTitle('tooltips.complete')).toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.pause')).not.toBeInTheDocument();
    });

    it('renders no action buttons for completed objective', () => {
        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="completed" />
        );

        expect(screen.queryByTitle('tooltips.complete')).not.toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.pause')).not.toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.resume')).not.toBeInTheDocument();
        expect(screen.getByTitle('tooltips.archive')).toBeInTheDocument();
    });

    it('renders no action buttons for archived objective', () => {
        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="archived" />
        );

        expect(screen.queryByTitle('tooltips.complete')).not.toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.pause')).not.toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.resume')).not.toBeInTheDocument();
        expect(screen.queryByTitle('tooltips.archive')).not.toBeInTheDocument();
    });

    it('opens dropdown menu when more button is clicked', async () => {
        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />
        );

        const moreButton = screen.getByTitle('tooltips.more');
        fireEvent.click(moreButton);

        await waitFor(() => {
            expect(screen.getByText('menu.complete')).toBeInTheDocument();
            expect(screen.getByText('menu.pause')).toBeInTheDocument();
            expect(screen.getByText('menu.archive')).toBeInTheDocument();
        });
    });

    it('fires success toasts when actions succeed', () => {
        objectiveMutations.complete.mockImplementation((_vars, options) => options?.onSuccess?.());
        objectiveMutations.pause.mockImplementation((_vars, options) => options?.onSuccess?.());
        objectiveMutations.archive.mockImplementation((_vars, options) => options?.onSuccess?.());

        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />
        );

        fireEvent.click(screen.getByTitle('tooltips.complete'));
        fireEvent.click(screen.getByTitle('tooltips.pause'));
        fireEvent.click(screen.getByTitle('tooltips.archive'));

        expect(toastMocks.success).toHaveBeenCalledWith('toast.completedSuccess');
        expect(toastMocks.success).toHaveBeenCalledWith('toast.pausedSuccess');
        expect(toastMocks.success).toHaveBeenCalledWith('toast.archivedSuccess');
    });

    it('fires error toasts when actions fail', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        objectiveMutations.complete.mockImplementation((_vars, options) =>
            options?.onError?.(new Error('complete failed'))
        );
        objectiveMutations.pause.mockImplementation((_vars, options) =>
            options?.onError?.(new Error('pause failed'))
        );
        objectiveMutations.archive.mockImplementation((_vars, options) =>
            options?.onError?.(new Error('archive failed'))
        );

        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="in_progress" />
        );

        fireEvent.click(screen.getByTitle('tooltips.complete'));
        fireEvent.click(screen.getByTitle('tooltips.pause'));
        fireEvent.click(screen.getByTitle('tooltips.archive'));

        expect(toastMocks.error).toHaveBeenCalledWith('toast.completeFailed');
        expect(toastMocks.error).toHaveBeenCalledWith('toast.pauseFailed');
        expect(toastMocks.error).toHaveBeenCalledWith('toast.archiveFailed');

        consoleSpy.mockRestore();
    });

    it('fires success and error toasts for resume action', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        objectiveMutations.resume
            .mockImplementationOnce((_vars, options) => options?.onSuccess?.())
            .mockImplementationOnce((_vars, options) =>
                options?.onError?.(new Error('resume failed'))
            );

        const testObjectiveId = 'test123' as Id<'objectives'>;
        renderWithQueryClient(
            <QuickActions objectiveId={testObjectiveId} currentStatus="paused" />
        );

        fireEvent.click(screen.getByTitle('tooltips.resume'));
        fireEvent.click(screen.getByTitle('tooltips.resume'));

        expect(toastMocks.success).toHaveBeenCalledWith('toast.resumedSuccess');
        expect(toastMocks.error).toHaveBeenCalledWith('toast.resumeFailed');

        consoleSpy.mockRestore();
    });
});
