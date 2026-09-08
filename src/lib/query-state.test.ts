import { describe, expect, test } from 'vitest';
import { queryState } from './query-state';

describe('query states', () => {
    test('errors take precedence over stale cached values', () => {
        const error = new Error('Network unavailable');
        expect(
            queryState(
                { data: [42], isError: true, isLoading: false, error },
                rows => rows.length === 0
            )
        ).toEqual({ status: 'error', error });
    });
    test('a partial page remains loading', () => {
        expect(
            queryState({ data: [], isLoading: true, isError: false }, rows => rows.length === 0)
        ).toEqual({ status: 'loading' });
    });
    test('an empty successful page differs from missing data', () => {
        expect(
            queryState({ data: [], isLoading: false, isError: false }, rows => rows.length === 0)
        ).toEqual({ status: 'empty' });
        expect(
            queryState<number[]>(
                { data: undefined, isLoading: false, isError: false },
                rows => rows.length === 0
            )
        ).toEqual({ status: 'loading' });
    });
    test('preserves valid falsy data', () => {
        expect(queryState({ data: 0, isLoading: false, isError: false }, () => false)).toEqual({
            status: 'ready',
            data: 0,
        });
        expect(queryState({ data: false, isLoading: false, isError: false }, () => false)).toEqual({
            status: 'ready',
            data: false,
        });
    });
});
