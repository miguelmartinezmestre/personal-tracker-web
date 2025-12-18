import { describe, it, expect } from "vitest";
import { objectiveSchema, savedObjectiveSchema } from "./objective";

describe("objectiveSchema", () => {
    it("should validate a valid objective", () => {
        const validObjective = {
            title: "Test Objective",
            description: "Test Description",
            category: "work",
            targetValue: 100,
            currentValue: 50,
            deadline: Date.now(),
            status: "in_progress",
            unit: "kg",
            objectiveType: "value",
            period: "none",
        };

        const result = objectiveSchema.safeParse(validObjective);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("Test Objective");
        }
    });

    it("should require title", () => {
        const invalidObjective = {
            description: "Test Description",
            targetValue: 100,
            currentValue: 50,
        };

        const result = objectiveSchema.safeParse(invalidObjective);
        expect(result.success).toBe(false);
        if (!result.success) {
            const titleError = result.error.issues.find(issue => issue.path.includes("title"));
            expect(titleError).toBeDefined();
        }
    });

    it("should allow optional fields to be null", () => {
        const objectiveWithNulls = {
            title: "Test Objective",
            description: null,
            category: null,
            targetValue: 100,
            currentValue: 50,
            deadline: null,
            status: null,
            unit: null,
            objectiveType: null,
            period: null,
            periodStart: null,
            periodLengthDays: null,
        };

        const result = objectiveSchema.safeParse(objectiveWithNulls);
        expect(result.success).toBe(true);
    });

    it("should allow optional fields to be undefined", () => {
        const objectiveWithUndefined = {
            title: "Test Objective",
            targetValue: 100,
            currentValue: 50,
            objectiveType: undefined,
            period: undefined,
        };

        const result = objectiveSchema.safeParse(objectiveWithUndefined);
        expect(result.success).toBe(true);
    });

    it("should require targetValue to be a number", () => {
        const invalidObjective = {
            title: "Test Objective",
            targetValue: "100",
            currentValue: 50,
        };

        const result = objectiveSchema.safeParse(invalidObjective);
        expect(result.success).toBe(false);
    });

    it("should require currentValue to be a number", () => {
        const invalidObjective = {
            title: "Test Objective",
            targetValue: 100,
            currentValue: "50",
        };

        const result = objectiveSchema.safeParse(invalidObjective);
        expect(result.success).toBe(false);
    });

    it("should require title to be non-empty", () => {
        const invalidObjective = {
            title: "",
            targetValue: 100,
            currentValue: 50,
        };

        const result = objectiveSchema.safeParse(invalidObjective);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe("Title is required");
        }
    });
});

describe("savedObjectiveSchema", () => {
    it("should validate a saved objective with _id", () => {
        const savedObjective = {
            _id: "obj123",
            title: "Test Objective",
            targetValue: 100,
            currentValue: 50,
        };

        const result = savedObjectiveSchema.safeParse(savedObjective);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe("obj123");
        }
    });

    it("should require _id", () => {
        const objectiveWithoutId = {
            title: "Test Objective",
            targetValue: 100,
            currentValue: 50,
        };

        const result = savedObjectiveSchema.safeParse(objectiveWithoutId);
        expect(result.success).toBe(false);
    });
});

