import { describe, it, expect } from "vitest";
import { teamSchema } from "./team";

describe("teamSchema", () => {
    it("should validate a valid team", () => {
        const validTeam = {
            name: "Engineering Team",
            description: "Our awesome engineering team",
        };

        const result = teamSchema.safeParse(validTeam);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("Engineering Team");
            expect(result.data.description).toBe("Our awesome engineering team");
        }
    });

    it("should require name", () => {
        const invalidTeam = {
            description: "Description",
        };

        const result = teamSchema.safeParse(invalidTeam);
        expect(result.success).toBe(false);
    });

    it("should require description", () => {
        const invalidTeam = {
            name: "Team Name",
        };

        const result = teamSchema.safeParse(invalidTeam);
        expect(result.success).toBe(false);
    });

    it("should allow empty string for name (Zod string() allows empty)", () => {
        const teamWithEmptyName = {
            name: "",
            description: "Description",
        };

        // Zod's z.string() allows empty strings by default
        // If we want to enforce non-empty, we'd need z.string().min(1)
        const result = teamSchema.safeParse(teamWithEmptyName);
        // This will pass because z.string() allows empty strings
        expect(result.success).toBe(true);
    });
});

