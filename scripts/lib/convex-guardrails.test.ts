import { describe, expect, it } from 'vitest';
import { findForbiddenQueries, findRawPublicFunctions, parseSource } from './convex-guardrails';

describe('Convex guardrail syntax', () => {
    it('detects aliases, namespace access, brackets and default exports', () => {
        const source = parseSource(
            'convex/nested/unsafe.ts',
            `
            import { query as read } from '../_generated/server';
            import * as server from '../_generated/server';
            const write = server['mutation'];
            export const a = read({});
            export const b = write({});
            export const c = server['action']({});
            export default server.query({});
        `
        );
        expect(findRawPublicFunctions(source).map(({ name, kind }) => [name, kind])).toEqual([
            ['a', 'query'],
            ['b', 'mutation'],
            ['c', 'action'],
            ['default', 'query'],
        ]);
    });

    it('detects bounded-query bypasses without prohibiting in-memory arrays', () => {
        const source = parseSource(
            'convex/nested/unsafe.ts',
            `
            const query = ctx['db']['query']('objectives').withIndex('organizationId');
            query['filter'](q => q.eq(q.field('status'), 'active'));
            query['collect']();
            ctx.db.query('user').collect();
            const rows = await query.take(20);
            rows.filter(row => row.active);
            [1, 2].filter(Boolean);
        `
        );
        expect(findForbiddenQueries(source).map(({ method }) => method)).toEqual([
            'filter',
            'collect',
            'collect',
        ]);
    });
});
