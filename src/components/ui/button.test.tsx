import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
    it("renders button with text", () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    });

    it("handles click events", async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();
        render(<Button onClick={handleClick}>Click me</Button>);

        await user.click(screen.getByRole("button"));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies default variant", () => {
        render(<Button>Default</Button>);
        const button = screen.getByRole("button");
        expect(button).toHaveClass("bg-primary");
    });

    it("applies destructive variant", () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByRole("button");
        expect(button).toHaveClass("bg-destructive");
    });

    it("applies outline variant", () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole("button");
        expect(button).toHaveClass("border");
    });

    it("applies size variants", () => {
        const { rerender } = render(<Button size="sm">Small</Button>);
        expect(screen.getByRole("button")).toHaveClass("h-8");

        rerender(<Button size="lg">Large</Button>);
        expect(screen.getByRole("button")).toHaveClass("h-10");
    });

    it("is disabled when disabled prop is true", () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole("button")).toBeDisabled();
    });

    it("renders as child component when asChild is true", () => {
        render(
            <Button asChild>
                <a href="/test">Link Button</a>
            </Button>
        );
        expect(screen.getByRole("link")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
        render(<Button className="custom-class">Custom</Button>);
        expect(screen.getByRole("button")).toHaveClass("custom-class");
    });
});

