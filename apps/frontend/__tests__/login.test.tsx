// import React from 'react'; // Added React import
// import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import { describe, it, expect, vi, beforeEach } from 'vitest';
// // Using TanStack Router testing utilities
// import {
//     RouterProvider,
//     createMemoryHistory,
//     createRootRoute,
//     createRoute,
//     createRouter,
// } from '@tanstack/react-router';
// import Login from '../src/components/login';
// import * as loginService from '../src/services/http/login'; // To mock the login service
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// // Mock the login service
// vi.mock('../src/services/http/login');

// // Mock TanStack Router useNavigate - basic mock
// const mockNavigate = vi.fn();
// vi.mock('@tanstack/react-router', async importOriginal => {
//     const original = await importOriginal<typeof import('@tanstack/react-router')>();
//     return {
//         ...original,
//         useNavigate: () => mockNavigate,
//     };
// });

// // Mock TanStack Query
// // vi.mock('tanstack/react-query', async (importOriginal) => {
// //   const original = await importOriginal<typeof import('@tanstack/react-query')>();
// //   return {
// //     ...original,
// //   };
// // });

// // Helper function to render with router context
// const rootRoute = createRootRoute();
// const loginRoute = createRoute({
//     getParentRoute: () => rootRoute,
//     path: '/login',
//     component: Login,
// });
// const indexRoute = createRoute({
//     getParentRoute: () => rootRoute,
//     path: '/',
//     component: () => <div>Home</div>,
// }); // Dummy index route
// const routeTree = rootRoute.addChildren([loginRoute, indexRoute]);

// const renderWithRouter = (initialPath = '/login') => {
//     const memoryHistory = createMemoryHistory({ initialEntries: [initialPath] });
//     const router = createRouter({ routeTree, history: memoryHistory });
//     const queryClient = new QueryClient();
//     return render(
//         <QueryClientProvider client={queryClient}>
//             <RouterProvider router={router} />
//         </QueryClientProvider>
//     );
// };

// describe('Login Component', () => {
//     beforeEach(() => {
//         // Reset mocks before each test
//         vi.clearAllMocks();
//     });

//     it('should render the login form', () => {
//         renderWithRouter();

//         expect(screen.getByTestId('email-input')).toBeInTheDocument();
//         expect(screen.getByTestId('password-input')).toBeInTheDocument();
//         expect(screen.getByTestId('login-button')).toBeInTheDocument();
//     });

//     it('should call the login service with credentials on submit and navigate on success', async () => {
//         // Mock successful login
//         const mockLoginUser = vi.spyOn(loginService, 'loginUser').mockResolvedValue(true);

//         renderWithRouter();

//         const emailInput = screen.getByLabelText(/email/i);
//         const passwordInput = screen.getByLabelText(/password/i);
//         const submitButton = screen.getByTestId('login-button');

//         // Simulate user input
//         await fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
//         await fireEvent.change(passwordInput, { target: { value: 'password123' } });

//         // Simulate form submission
//         await fireEvent.click(submitButton);

//         // Check if the login service was called
//         await waitFor(() => {
//             expect(mockLoginUser).toHaveBeenCalledTimes(1);
//             expect(mockLoginUser).toHaveBeenCalledWith({
//                 email: 'test@example.com',
//                 password: 'password123',
//             });
//         });

//         // Check if navigation occurred on success
//         await waitFor(() => {
//             expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard/home' });
//         });

//         // Clean up the mock after the test
//         mockLoginUser.mockRestore();
//     });

//     // Add test for failed login
//     it('should display error message on failed login', async () => {
//         const errorMessage = 'No ha sido posible iniciar sesión';
//         // Mock failed login
//         const mockLoginUser = vi
//             .spyOn(loginService, 'loginUser')
//             .mockRejectedValue(new Error(errorMessage));

//         renderWithRouter();

//         const emailInput = screen.getByLabelText(/email/i);
//         const passwordInput = screen.getByLabelText(/password/i);
//         const submitButton = screen.getByTestId('login-button');

//         // Simulate user input
//         await fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
//         await fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

//         // Simulate form submission
//         await fireEvent.click(submitButton);

//         // Check if the login service was called
//         await waitFor(() => {
//             expect(mockLoginUser).toHaveBeenCalledTimes(1);
//         });

//         // Check if the error message is displayed (assuming it's rendered somewhere)
//         await waitFor(() => {
//             expect(screen.getByText(errorMessage)).toBeInTheDocument();
//         });

//         // Check that navigation did NOT occur
//         expect(mockNavigate).not.toHaveBeenCalled();

//         // Clean up the mock after the test
//         mockLoginUser.mockRestore();
//     });

//     // Add test for validation (empty fields)
//     it('should show validation errors for empty fields', async () => {
//         renderWithRouter();
//         const submitButton = screen.getByTestId('login-button');

//         await fireEvent.click(submitButton);

//         // Check for validation messages (uses react-hook-form and zod schema)
//         // Need to check how the Login component displays these errors.
//         // Assuming standard react-hook-form errors associated with inputs
//         await waitFor(() => {
//             // Example: Check for error near email field. Adjust selector as needed.
//             expect(screen.getByText(/email is required/i)).toBeInTheDocument();
//             // Example: Check for error near password field. Adjust selector as needed.
//             expect(screen.getByText(/password is required/i)).toBeInTheDocument();
//         });

//         // Check that the login service was not called
//         expect(loginService.loginUser).not.toHaveBeenCalled();
//         // Check that navigation did not occur
//         expect(mockNavigate).not.toHaveBeenCalled();
//     });
// });
