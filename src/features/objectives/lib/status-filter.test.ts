import { expect, test } from 'vitest';
import {
    objectiveDetailHref,
    objectivesListHref,
    parseObjectiveStatusFilter,
} from './status-filter';

test('reads the status filter from the URL and ignores unknown values', () => {
    expect(parseObjectiveStatusFilter('completed')).toBe('completed');
    expect(parseObjectiveStatusFilter('active')).toBe('active');
    expect(parseObjectiveStatusFilter(undefined)).toBe('all');
    expect(parseObjectiveStatusFilter('archived')).toBe('all');
    expect(parseObjectiveStatusFilter(['active', 'completed'])).toBe('all');
});

test('carries the filter to the detail page and back to the same list view', () => {
    expect(objectiveDetailHref('abc', 'completed')).toBe(
        '/dashboard/objectives/abc?status=completed'
    );
    expect(objectivesListHref('completed')).toBe('/dashboard/objectives?status=completed');
    expect(objectiveDetailHref('abc', 'all')).toBe('/dashboard/objectives/abc');
    expect(objectivesListHref('all')).toBe('/dashboard/objectives');
});
