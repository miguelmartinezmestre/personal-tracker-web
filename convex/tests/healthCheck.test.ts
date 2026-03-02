import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules } from './test.setup';

describe('convex healthCheck', async () => {
    const t = convexTest(schema, modules);

    describe('get', () => {
        test('returns OK status', async () => {
            const result = await t.query(api.healthCheck.get, {});
            expect(result).toBe('OK');
        });

        test('is accessible without authentication', async () => {
            // Health check should work without user identity
            const result = await t.query(api.healthCheck.get, {});
            expect(result).toBe('OK');
        });

        test('returns consistent response', async () => {
            // Multiple calls should return the same result
            const result1 = await t.query(api.healthCheck.get, {});
            const result2 = await t.query(api.healthCheck.get, {});
            const result3 = await t.query(api.healthCheck.get, {});

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
            expect(result1).toBe('OK');
        });
    });
});
