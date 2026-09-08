import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '../convex/_generated/api';
import { registerSensitiveValues, redactSensitiveText } from './lib/command';

async function main() {
    const env = z
        .record(z.string(), z.string())
        .parse(JSON.parse(readFileSync('.local-stack/verification.json', 'utf8')));
    assert.equal(env.CONVEX_SELF_HOSTED_URL, 'http://127.0.0.1:5210');
    registerSensitiveValues(Object.values(env));
    const client = new ConvexHttpClient('http://127.0.0.1:5210');
    let cookie = '';
    async function auth(path: string, body?: object) {
        const response = await fetch(`http://127.0.0.1:5211/api/auth${path}`, {
            method: body ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
                Origin: 'http://127.0.0.1:5300',
                Cookie: cookie,
                'x-setup-secret': env.SETUP_SECRET ?? '',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) {
            cookie = cookies.map(value => value.split(';')[0]).join('; ');
            registerSensitiveValues([cookie]);
        }
        return response;
    }
    const password = `Synthetic-${randomUUID()}`;
    registerSensitiveValues([password]);
    const signup = await auth('/sign-up/email', {
        name: 'Local verification',
        email: `verification-${randomUUID()}@example.test`,
        password,
    });
    assert.equal(signup.status, 200, `Local signup returned HTTP ${signup.status}`);
    const identity = z.object({ user: z.object({ id: z.string() }) }).parse(await signup.json());
    const tokenResponse = await auth('/convex/token');
    assert.equal(tokenResponse.status, 200);
    const { token } = z.object({ token: z.string() }).parse(await tokenResponse.json());
    registerSensitiveValues([token]);
    client.setAuth(token);
    if (!(await client.query(api.setup.isPlatformSetUp, {}))) {
        await client.mutation(api.setup.completeSetup, {
            platformName: 'Synthetic verification',
            defaultLanguage: 'es',
            registrationPolicy: 'open',
            organizationName: 'Verification group',
            categories: [],
        });
    }
    const firstId = await client.mutation(api.objectives.createObjective, {
        title: 'Verification first',
        targetValue: 100,
        startValue: 7,
        visibility: 'private',
    });
    const secondId = await client.mutation(api.objectives.createObjective, {
        title: 'Verification second',
        targetValue: 100,
        startValue: 9,
        visibility: 'private',
    });
    const first = await client.query(api.objectives.getObjectives, {
        paginationOpts: { cursor: null, numItems: 1 },
    });
    assert.equal(first.page.length, 1);
    assert.equal(first.needsContinuation, false);
    assert.ok(first.continueCursor.startsWith('vp1.'));
    const second = await client.query(api.objectives.getObjectives, {
        paginationOpts: { cursor: first.continueCursor, numItems: 1 },
    });
    assert.deepEqual(
        new Set([...first.page, ...second.page].map(row => row._id)),
        new Set([firstId, secondId])
    );
    const forbidden = await auth('/admin/ban-user', { userId: identity.user.id });
    assert.ok(
        [401, 403, 404].includes(forbidden.status),
        `Alternative admin route returned HTTP ${forbidden.status}`
    );
    const current = await client.query(api.auth.getCurrentUser, {});
    assert.equal(current?._id, identity.user.id);
    assert.notEqual(current.banned, true);
    const evidence = {
        verifiedAt: new Date().toISOString(),
        environment: 'local synthetic backend 127.0.0.1:5210',
        encryptedCursorRoundTrip: true,
        distinctObjectives: 2,
        alternativeAdminStatus: forbidden.status,
        accountRemainsActive: true,
    };
    mkdirSync('reports/verification', { recursive: true });
    writeFileSync(
        'reports/verification/backend-http.json',
        JSON.stringify(evidence, null, 2) + '\n'
    );
    console.log(
        'Local HTTP verification passed: authenticated pagination, encrypted cursor and administrative route guard.'
    );
}

main().catch(error => {
    console.error(
        redactSensitiveText(error instanceof Error ? error.message : 'Local verification failed')
    );
    process.exitCode = 1;
});
