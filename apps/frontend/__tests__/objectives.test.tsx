import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
// Use TanStack Router testing utils
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, useParams } from '@tanstack/react-router';
import Objectives from '../src/components/objectives';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import services and hooks for spying/mocking
import * as objectivesService from '../src/services/http/objectives';
import { useAuthContext } from '../src/providers/auth-provider';
import { Objetive } from '../src/models/objetive'; // Import type

// --- Mocks ---

// Mock the useAuthContext hook
vi.mock('../src/providers/auth-provider', () => ({
    useAuthContext: vi.fn(),
}));

// Mock react-i18next preserving other exports
vi.mock('react-i18next', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    return {
        ...actual, // Include original exports like initReactI18next
        useTranslation: () => ({ t: (key: string) => key }), // Mock only useTranslation
    };
});

// --- Mock Data ---
const mockUser = { id: 1, email: 'test@test.com', name: 'Test User' };
const mockObjectives: Objetive[] = [
    { id: 1, title: 'Objective 1', description: 'Desc 1', category: 'Cat A', targetValue: 100, currentValue: 50, deadline: new Date(), status: 'In Progress', unit: '%', userId: 1 },
    { id: 2, title: 'Objective 2', description: 'Desc 2', category: 'Cat B', targetValue: 200, currentValue: 100, deadline: new Date(), status: 'Done', unit: 'items', userId: 1 },
];

// --- Test Setup ---
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

// Helper function to render with router context
const rootRoute = createRootRoute();

// Define the component using useParams
function ObjectiveDetailComponent() {
    const params = useParams({ from: objectiveDetailRoute.id }); // Get params using the hook
    return <div data-testid="objective-detail-page">Detail: {params.id}</div>;
}

// Create routes
const objectiveDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard/objectives/$id', component: ObjectiveDetailComponent });
const objectivesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard/objectives', component: Objectives });
const routeTree = rootRoute.addChildren([objectivesRoute, objectiveDetailRoute]);

const renderWithRouter = (initialPath = '/dashboard/objectives') => {
    const memoryHistory = createMemoryHistory({ initialEntries: [initialPath] });
    const router = createRouter({ routeTree, history: memoryHistory });

    vi.mocked(useAuthContext).mockReturnValue({
        user: mockUser,
        isLoading: false,
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    );
}

// --- Test Suite ---
describe('Objectives Component', () => {
    let getObjectivesSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();

        getObjectivesSpy = vi.spyOn(objectivesService, 'getObjectives').mockResolvedValue(mockObjectives);
    });

    it('should render the objectives table', async () => {
        renderWithRouter();

        await waitFor(() => {
            expect(getObjectivesSpy).toHaveBeenCalledWith(mockUser.id);
        });

        expect(screen.getByText('Objective 1')).toBeInTheDocument();
        expect(screen.getByText('Objective 2')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should open the create objective modal when create button is clicked', async () => {
        renderWithRouter();
        await waitFor(() => { expect(getObjectivesSpy).toHaveBeenCalled(); });

        const createButton = screen.getByRole('button', { name: /crear objetivo/i });
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: /^title$/i })).toBeInTheDocument();
        });
        expect(within(screen.getByRole('dialog')).getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('should open the update objective modal when edit button is clicked', async () => {
        renderWithRouter();
        await waitFor(() => { expect(getObjectivesSpy).toHaveBeenCalled(); });

        const editButtons = screen.getAllByRole('button', { name: /editar objetivo/i });
        fireEvent.click(editButtons[0]);

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: /update progress/i })).toBeInTheDocument();
        });
        expect(within(screen.getByRole('dialog')).getByDisplayValue(mockObjectives[0].title)).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByDisplayValue(mockObjectives[0].description)).toBeInTheDocument();
    });

    it('should navigate to the objective detail page when link is clicked', async () => {
        renderWithRouter();
        await waitFor(() => { expect(getObjectivesSpy).toHaveBeenCalled(); });

        const detailLinks = screen.getAllByRole('link', { name: /ir actividad/i });
        fireEvent.click(detailLinks[0]);

        await waitFor(() => {
            expect(screen.getByTestId('objective-detail-page')).toBeInTheDocument();
            expect(screen.getByText(`Detail: ${mockObjectives[0].id}`)).toBeInTheDocument();
        });
    });

    // Add tests for form submission (create/update) if needed
}); 