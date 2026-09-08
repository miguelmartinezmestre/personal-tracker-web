import { describe, expect, test } from 'vitest';
import { buildProgressPoints } from './progress-points';

describe('visible progress window', () => {
    test.each([0, 10, 500, 501, 600])(
        'preserves the persisted accumulated value for %i updates',
        count => {
            const all = Array.from({ length: count }, (_, i) => ({
                updateDate: i,
                updatedValue: 1,
            }));
            const objective = { startValue: 10, currentValue: 10 + count, targetValue: 1000 };
            const window = all.slice(-500);
            const baseline = objective.currentValue - window.length;
            const points = buildProgressPoints(window, objective, baseline);
            expect(points).toHaveLength(Math.min(500, count));
            if (count) {
                expect(points[0]?.currentValue).toBe(baseline + 1);
                expect(points.at(-1)?.currentValue).toBe(objective.currentValue);
            }
        }
    );

    test('uses the backend snapshot baseline when an objective subscription is newer', () => {
        const points = buildProgressPoints(
            [{ updateDate: 1, updatedValue: 5 }],
            { currentValue: 30, targetValue: 100 },
            20
        );
        expect(points[0]?.currentValue).toBe(25);
    });

    test('reconstructs edited and removed updates in chronological order', () => {
        const objective = { startValue: 15, currentValue: 26, targetValue: 100 };
        const points = buildProgressPoints(
            [
                { updateDate: 3, updatedValue: 4 },
                { updateDate: 1, updatedValue: 7 },
            ],
            objective,
            15
        );
        expect(points.map(point => point.currentValue)).toEqual([22, 26]);
    });
});
