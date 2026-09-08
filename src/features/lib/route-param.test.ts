import { expect, test } from 'vitest';
import { optionalRouteParam, requiredRouteParam } from './route-param';

test.each([undefined, '', ' ', ['one', 'two']])(
    'rejects an absent or ambiguous route parameter',
    value => {
        expect(() => requiredRouteParam(value)).toThrow('Invalid route parameter');
    }
);
test('parses strings without pretending to validate a database identifier', () => {
    expect(requiredRouteParam('not-a-database-id')).toBe('not-a-database-id');
    expect(optionalRouteParam('  ')).toBeUndefined();
});
