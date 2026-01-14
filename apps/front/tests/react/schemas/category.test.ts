import { describe, it, expect } from 'vitest';
import { categorySchema, savedCategorySchema, categoryIconSchema } from '@/schemas/category';

describe('categorySchema', () => {
    it('should validate a valid category', () => {
        const validCategory = {
            name: 'Work',
            color: '#3b82f6',
            icon: 'briefcase',
        };

        const result = categorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe('Work');
            expect(result.data.color).toBe('#3b82f6');
            expect(result.data.icon).toBe('briefcase');
        }
    });

    it('should validate a category without icon', () => {
        const validCategory = {
            name: 'Personal',
            color: '#22c55e',
        };

        const result = categorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe('Personal');
            expect(result.data.color).toBe('#22c55e');
            expect(result.data.icon).toBeUndefined();
        }
    });

    it('should require name', () => {
        const invalidCategory = {
            color: '#3b82f6',
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const nameError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) => issue.path.includes('name'));
            expect(nameError).toBeDefined();
        }
    });

    it('should require color', () => {
        const invalidCategory = {
            name: 'Work',
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const colorError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) => issue.path.includes('color'));
            expect(colorError).toBeDefined();
        }
    });

    it('should validate color as hex code', () => {
        const invalidCategory = {
            name: 'Work',
            color: 'blue',
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
    });

    it('should validate name max length', () => {
        const invalidCategory = {
            name: 'a'.repeat(51),
            color: '#3b82f6',
        };

        const result = categorySchema.safeParse(invalidCategory);
        expect(result.success).toBe(false);
    });

    it('should validate valid icons', () => {
        const validIcons = categoryIconSchema.options;
        expect(validIcons).toContain('heart');
        expect(validIcons).toContain('briefcase');
        expect(validIcons).toContain('book');
        expect(validIcons).toContain('user');
        expect(validIcons).toContain('dollar-sign');
    });
});

describe('savedCategorySchema', () => {
    it('should validate a saved category with id', () => {
        const savedCategory = {
            id: 'abc123' as const,
            name: 'Health',
            color: '#ef4444',
            icon: 'heart',
        };

        const result = savedCategorySchema.safeParse(savedCategory);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe('abc123');
            expect(result.data.name).toBe('Health');
        }
    });

    it('should require id for saved category', () => {
        const invalidSavedCategory = {
            name: 'Work',
            color: '#3b82f6',
        };

        const result = savedCategorySchema.safeParse(invalidSavedCategory);
        expect(result.success).toBe(false);
        if (!result.success) {
            const idError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) => issue.path.includes('id'));
            expect(idError).toBeDefined();
        }
    });
});
