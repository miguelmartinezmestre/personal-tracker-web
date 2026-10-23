import { expect, test } from 'vitest';
import { objectiveDetailHref, objectivesListHref, parseObjectiveListFilters } from './list-filters';

test('reads the filters from the URL and ignores unknown values', () => {
    expect(
        parseObjectiveListFilters({ status: 'completed', deadline: 'week', category: 'abc' })
    ).toEqual({ status: 'completed', deadline: 'week', category: 'abc' });
    expect(parseObjectiveListFilters({ status: 'archived', deadline: ['today', 'week'] })).toEqual({
        status: 'all',
        deadline: 'all',
        category: 'all',
    });
});

test('carries the filters to the detail page and back to the same list view', () => {
    const filters = { status: 'active', deadline: 'overdue', category: 'abc' } as const;

    expect(objectiveDetailHref('xyz', filters)).toBe(
        '/dashboard/objectives/xyz?status=active&deadline=overdue&category=abc'
    );
    expect(objectivesListHref({ status: 'all', deadline: 'all', category: 'all' })).toBe(
        '/dashboard/objectives'
    );
});
