import { describe, it, expect } from "vitest";
import { categorySchema, savedCategorySchema } from "./category";

describe("categorySchema", () => {
    it("should validate a valid category", () => {
        const validCategory = {
            name: "Work",
            objectives: [1, 2, 3],
        };

        const result = categorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("Work");
            expect(result.data.objectives).toEqual([1, 2, 3]);
        }
    });

    it("should require name", () => {
        const invalidCategory = {
            objectives: [1, 2],
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const nameError = result.error.issues.find(issue => issue.path.includes("name"));
            expect(nameError).toBeDefined();
        }
    });

    it("should require objectives", () => {
        const invalidCategory = {
            name: "Work",
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const objectivesError = result.error.issues.find(issue => issue.path.includes("objectives"));
            expect(objectivesError).toBeDefined();
        }
    });

    it("should accept empty objectives array", () => {
        const validCategory = {
            name: "Personal",
            objectives: [],
        };

        const result = categorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
    });

    it("should validate objectives as array of numbers", () => {
        const invalidCategory = {
            name: "Work",
            objectives: ["one", "two"],
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
    });

    it("should accept empty name string", () => {
        const validCategory = {
            name: "",
            objectives: [1],
        };

        const result = categorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
    });
});

describe("savedCategorySchema", () => {
    it("should validate a saved category with _id", () => {
        const savedCategory = {
            _id: "abc123",
            name: "Health",
            objectives: [1, 2],
        };

        const result = savedCategorySchema.safeParse(savedCategory);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._id).toBe("abc123");
            expect(result.data.name).toBe("Health");
        }
    });

    it("should require _id for saved category", () => {
        const invalidSavedCategory = {
            name: "Work",
            objectives: [1],
        };

        const result = savedCategorySchema.safeParse(invalidSavedCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find(issue => issue.path.includes("_id"));
            expect(idError).toBeDefined();
        }
    });
});
