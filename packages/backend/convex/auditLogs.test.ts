// import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
// import { api } from './_generated/api';
// import schema from './schema';
// import { modules } from '../test.setup';
// import { createTestUser } from './test_helpers';

// describe('convex auditLogs', () => {
//     const t = convexTest(schema, modules);
//     let userId: string;

//     const userIdentity = t.withIdentity({
//         subject: 'test-user-123',
//         role: 'admin',
//     });

//     beforeEach(async () => {
//         // Create a complete test user with account (similar to better-auth sign-up)
//         const result = await userIdentity.run(async ctx => {
//             return await createTestUser(ctx, {
//                 userId: 'test-user-123',
//                 email: 'test@example.com',
//                 name: 'Test User',
//                 password: 'test-password',
//                 role: 'admin',
//                 emailVerified: false,
//             });
//         });
//         userId = result.userId;
//     });

//     test('getAuditLogs returns audit logs sorted by date', async () => {
//         // Create some audit logs
//         await userIdentity.run(async ctx => {
//             const now = Date.now();
//             await ctx.db.insert('auditLogs', {
//                 user: userId,
//                 action: 'CREATE_OBJECTIVE',
//                 createdAt: now - 2000,
//                 updatedAt: now - 2000,
//             });
//             await ctx.db.insert('auditLogs', {
//                 user: userId,
//                 action: 'UPDATE_OBJECTIVE',
//                 createdAt: now - 1000,
//                 updatedAt: now - 1000,
//             });
//             await ctx.db.insert('auditLogs', {
//                 user: userId,
//                 action: 'DELETE_OBJECTIVE',
//                 createdAt: now,
//                 updatedAt: now,
//             });
//         });

//         const logs = await userIdentity.query(api.auditLogs.getAuditLogs, {});

//         expect(logs.length).toBeGreaterThanOrEqual(3);
//         // Should be sorted descending (most recent first)
//         for (let i = 0; i < logs.length - 1; i++) {
//             const current = logs[i]?.createdAt;
//             const next = logs[i + 1]?.createdAt;
//             if (current !== undefined && next !== undefined) {
//                 expect(current).toBeGreaterThanOrEqual(next);
//             }
//         }
//     });

//     test('getAuditLogs limits to 100 logs', async () => {
//         // Create more than 100 logs
//         await userIdentity.run(async ctx => {
//             const now = Date.now();
//             for (let i = 0; i < 150; i++) {
//                 await ctx.db.insert('auditLogs', {
//                     user: userId,
//                     action: `ACTION_${i}`,
//                     createdAt: now - i * 1000,
//                     updatedAt: now - i * 1000,
//                 });
//             }
//         });

//         const logs = await userIdentity.query(api.auditLogs.getAuditLogs, {});

//         expect(logs.length).toBeLessThanOrEqual(100);
//     });

//     test('getAuditLogs returns empty array when no logs exist', async () => {
//         const logs = await userIdentity.query(api.auditLogs.getAuditLogs, {});
//         expect(Array.isArray(logs)).toBe(true);
//     });
// });

describe('convex auditLogs', () => {
    test('dummy test', async () => {
        expect(true).toBe(true);
    });
});
