import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import '@testing-library/jest-dom/vitest'; // Import jest-dom matchers for vitest
import Objective from '../src/components/objective';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import modules for spying
import * as objectiveService from '../src/services/http/objectives';
import * as updateProgressService from '../src/services/http/update-progress';
// Import types/functions for typing spies
import { getObjective } from '../src/services/http/objectives';
import { getUpdateProgress } from '../src/services/http/update-progress';
// import { createUpdateProgress } from '../src/services/http/update-progress'; // Keep commented for now
import { UpdateProgress } from '../src/models/update-progress'; // Import type for mock
// Import the hook we are mocking AFTER the mock definition
import { useAuthContext } from '../src/providers/auth-provider';

// --- Mocks ---
// Mock TanStack Router useParams directly
vi.mock('@tanstack/react-router', async importOriginal => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...actual,
        useParams: vi.fn(() => ({ id: '1' })),
    };
});

// Mock useAuthContext hook
vi.mock('../src/providers/auth-provider', () => ({
    useAuthContext: vi.fn(),
}));

// Mock the Graph component
vi.mock('../src/components/graph3', () => ({
    Graph3: () => <div data-testid="mock-graph3">Mock Graph</div>,
}));

// --- Mock Data ---
const mockUser = { id: 1, email: 'test@test.com', name: 'Test User' };
const mockObjectiveData = {
    id: 1,
    title: 'Objective Detail',
    description: 'Detail Desc',
    category: 'Test',
    targetValue: 150,
    currentValue: 75,
    deadline: new Date(),
    status: 'Active',
    unit: 'tasks',
    userId: 1,
};
const mockProgressData: UpdateProgress[] = [
    {
        id: 1,
        goalId: 1,
        updatedValue: 25,
        updateDate: new Date('2023-01-15'),
        comment: 'Initial progress',
    },
    {
        id: 2,
        goalId: 1,
        updatedValue: 75,
        updateDate: new Date('2023-02-20'),
        comment: 'Reached milestone',
    },
];

// --- Test Setup ---
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderComponent = () => {
    // Use the imported hook with vi.mocked
    vi.mocked(useAuthContext).mockReturnValue({
        user: mockUser,
        isLoading: false,
    });

    return render(
        <QueryClientProvider client={queryClient}>
            {/* Render the component directly now that the hook is mocked */}
            <Objective />
        </QueryClientProvider>
    );
};

// --- Test Suite ---
describe('Objective Component', () => {
    let getObjectiveSpy;
    let getUpdateProgressSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();

        // Assign spies and let TypeScript infer the type
        getObjectiveSpy = vi
            .spyOn(objectiveService, 'getObjective')
            .mockResolvedValue(mockObjectiveData);
        getUpdateProgressSpy = vi
            .spyOn(updateProgressService, 'getUpdateProgress')
            .mockResolvedValue(mockProgressData);
    });

    it('should render the objective details, graph, and progress table', async () => {
        renderComponent();

        await waitFor(() => {
            expect(getObjectiveSpy).toHaveBeenCalledWith(1);
            expect(getUpdateProgressSpy).toHaveBeenCalledWith(1);
        });

        expect(screen.getByTestId('mock-graph3')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Initial progress')).toBeInTheDocument();
        expect(screen.getByText('Reached milestone')).toBeInTheDocument();
    });

    it('should open the update progress modal when the button is clicked', async () => {
        renderComponent();
        await screen.findByRole('button', { name: /update progress/i });

        const updateButton = screen.getByRole('button', { name: /update progress/i });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: /objetive/i })).toBeInTheDocument();
        });
    });

    // Example test for form submission
    it('should call mutation when update progress form is submitted', async () => {
        // Ensure the spy is active for this test
        const createUpdateProgressSpy = vi
            .spyOn(updateProgressService, 'createUpdateProgress')
            .mockResolvedValue({
                id: 2,
                comment: 'New progress update',
                updatedValue: 75,
                goalId: 1,
                updateDate: new Date(),
            });

        renderComponent();
        await screen.findByRole('button', { name: /update progress/i });

        const updateButton = screen.getByRole('button', { name: /update progress/i });
        fireEvent.click(updateButton);

        const dialog = await screen.findByRole('dialog', { name: /objetive/i });
        // Assuming form fields have accessible labels or test-ids
        const commentInput = within(dialog).getByLabelText(/comment/i); // Adjust selector
        const valueInput = within(dialog).getByLabelText(/updated value/i); // Adjust selector
        const submitButton = within(dialog).getByRole('button', { name: /submit/i }); // Adjust selector

        const newProgress = {
            comment: 'New progress update',
            updatedValue: 75,
        };

        fireEvent.change(commentInput, { target: { value: newProgress.comment } });
        fireEvent.change(valueInput, { target: { value: String(newProgress.updatedValue) } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(createUpdateProgressSpy).toHaveBeenCalledTimes(1);
            expect(createUpdateProgressSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    comment: newProgress.comment,
                    updatedValue: newProgress.updatedValue,
                    goalId: 1,
                })
            );
        });
    });
});
