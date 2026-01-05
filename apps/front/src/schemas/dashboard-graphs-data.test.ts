import { describe, it, expect } from 'vitest';
import { dashboardGraphsDataSchema } from './dashboard-graphs-data';

describe('dashboardGraphsDataSchema', () => {
    const validData = {
        totalObjectives: 10,
        pendingObjectives: 3,
        completedObjectives: 7,
        progressAddedPerMonth: [
            { month: 'January', count: 5 },
            { month: 'February', count: 8 },
        ],
        mostRecentObjectivesDeadlines: [
            { objective: 'Learn TypeScript', days: 5, fill: '#ff0000' },
            { objective: 'Complete Project', days: 10, fill: '#00ff00' },
        ],
        objectivesWithMostProgress: [
            { objective: 'Learn React', progress: 80 },
            { objective: 'Build App', progress: 60 },
        ],
    };

    it('should validate valid dashboard data', () => {
        const result = dashboardGraphsDataSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.totalObjectives).toBe(10);
            expect(result.data.pendingObjectives).toBe(3);
            expect(result.data.completedObjectives).toBe(7);
        }
    });

    it('should require totalObjectives', () => {
        const invalidData = { ...validData };
        delete (invalidData as any).totalObjectives;

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should require pendingObjectives', () => {
        const invalidData = { ...validData };
        delete (invalidData as any).pendingObjectives;

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should require completedObjectives', () => {
        const invalidData = { ...validData };
        delete (invalidData as any).completedObjectives;

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should validate progressAddedPerMonth array', () => {
        const result = dashboardGraphsDataSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.progressAddedPerMonth).toHaveLength(2);
            expect(result.data.progressAddedPerMonth[0]?.month).toBe('January');
            expect(result.data.progressAddedPerMonth[0]?.count).toBe(5);
        }
    });

    it('should accept empty progressAddedPerMonth array', () => {
        const dataWithEmptyProgress = {
            ...validData,
            progressAddedPerMonth: [],
        };

        const result = dashboardGraphsDataSchema.safeParse(dataWithEmptyProgress);
        expect(result.success).toBe(true);
    });

    it('should validate progressAddedPerMonth items structure', () => {
        const invalidData = {
            ...validData,
            progressAddedPerMonth: [{ month: 'January' }], // missing count
        };

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should validate mostRecentObjectivesDeadlines array', () => {
        const result = dashboardGraphsDataSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.mostRecentObjectivesDeadlines).toHaveLength(2);
            expect(result.data.mostRecentObjectivesDeadlines[0]?.objective).toBe(
                'Learn TypeScript'
            );
            expect(result.data.mostRecentObjectivesDeadlines[0]?.days).toBe(5);
            expect(result.data.mostRecentObjectivesDeadlines[0]?.fill).toBe('#ff0000');
        }
    });

    it('should accept empty mostRecentObjectivesDeadlines array', () => {
        const dataWithEmptyDeadlines = {
            ...validData,
            mostRecentObjectivesDeadlines: [],
        };

        const result = dashboardGraphsDataSchema.safeParse(dataWithEmptyDeadlines);
        expect(result.success).toBe(true);
    });

    it('should validate mostRecentObjectivesDeadlines items structure', () => {
        const invalidData = {
            ...validData,
            mostRecentObjectivesDeadlines: [{ objective: 'Test', days: 5 }], // missing fill
        };

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should validate objectivesWithMostProgress array', () => {
        const result = dashboardGraphsDataSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.objectivesWithMostProgress).toHaveLength(2);
            expect(result.data.objectivesWithMostProgress[0]?.objective).toBe('Learn React');
            expect(result.data.objectivesWithMostProgress[0]?.progress).toBe(80);
        }
    });

    it('should accept empty objectivesWithMostProgress array', () => {
        const dataWithEmptyProgress = {
            ...validData,
            objectivesWithMostProgress: [],
        };

        const result = dashboardGraphsDataSchema.safeParse(dataWithEmptyProgress);
        expect(result.success).toBe(true);
    });

    it('should validate objectivesWithMostProgress items structure', () => {
        const invalidData = {
            ...validData,
            objectivesWithMostProgress: [{ objective: 'Test' }], // missing progress
        };

        const result = dashboardGraphsDataSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should accept zero values for numeric fields', () => {
        const dataWithZeros = {
            totalObjectives: 0,
            pendingObjectives: 0,
            completedObjectives: 0,
            progressAddedPerMonth: [],
            mostRecentObjectivesDeadlines: [],
            objectivesWithMostProgress: [],
        };

        const result = dashboardGraphsDataSchema.safeParse(dataWithZeros);
        expect(result.success).toBe(true);
    });

    it('should accept negative days for deadlines', () => {
        const dataWithNegativeDays = {
            ...validData,
            mostRecentObjectivesDeadlines: [
                { objective: 'Overdue Task', days: -5, fill: '#ff0000' },
            ],
        };

        const result = dashboardGraphsDataSchema.safeParse(dataWithNegativeDays);
        expect(result.success).toBe(true);
    });
});
