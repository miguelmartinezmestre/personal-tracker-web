import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./login-form";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock auth-client
const mockSignIn = vi.fn();
vi.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            email: (...args: any[]) => mockSignIn(...args),
        },
    },
}));

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSignIn.mockClear();
    });

    it("renders login form", () => {
        render(<LoginForm />);
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });

    it("shows validation error for empty email", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            // Zod shows "Invalid email address" for empty string
            // Look for the specific error message, not the label
            expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        });
    });

    it("shows validation error for invalid email", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        await user.type(emailInput, "invalid-email");

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
        });
    });

    it("shows validation error for empty password", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        
        await user.type(emailInput, "test@example.com");
        // Touch the password field to trigger validation
        await user.click(passwordInput);
        await user.tab(); // Move focus away to trigger validation

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            // Zod shows "String must contain at least 8 character(s)" or "Too small" for password < 8 chars
            // Look for any validation error related to password length
            const errorMessage = screen.queryByText(/must contain at least|too small|8 character/i);
            expect(errorMessage).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("calls signIn on valid form submission", async () => {
        const user = userEvent.setup();
        mockSignIn.mockResolvedValue({});

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith(
                {
                    email: "test@example.com",
                    password: "password123",
                },
                expect.any(Object)
            );
        });
    });

    it("redirects to dashboard on successful login", async () => {
        const user = userEvent.setup();
        mockSignIn.mockImplementation((_, { onSuccess }) => {
            onSuccess();
            return Promise.resolve({});
        });

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/dashboard/home");
        });
    });

    it("displays error message on login failure", async () => {
        const user = userEvent.setup();
        mockSignIn.mockImplementation((_, { onError }) => {
            onError({ error: { message: "Invalid credentials" } });
            return Promise.resolve({});
        });

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "wrongpassword");

        const submitButton = screen.getByRole("button", { name: /login/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
        });
    });
});

