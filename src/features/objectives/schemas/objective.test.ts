import { expect, test } from 'vitest';
import { objectiveFormSchema } from './objective';

const message = <TKey extends string>(key: TKey) => key;

test('requires the target ahead of the start in the chosen direction @INH-OBJ-03 @REQ-NF-005', () => {
    const errors = (direction: 'increase' | 'decrease', startValue: number, targetValue: number) =>
        objectiveFormSchema(message)
            .safeParse({
                title: 'Weight',
                description: '',
                categoryId: 'none',
                unit: 'kg',
                direction,
                startValue,
                targetValue,
                deadline: '',
                dueSoonDays: 7,
                memberAccess: 'view',
                users: [],
            })
            .error?.issues.map(issue => issue.message) ?? [];

    expect(errors('decrease', 90, 80)).toEqual([]);
    expect(errors('increase', -5, -1)).toEqual([]);
    expect(errors('increase', 90, 80)).toEqual(['targetDirection']);
    expect(errors('decrease', 80, 80)).toEqual(['targetDirection']);
});
