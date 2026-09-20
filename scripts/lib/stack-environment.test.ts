// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { buildStackEnvironment } from './stack-environment';
import { redactSensitiveText, runCommandWithInput } from './command';

describe('isolated stack environment', () => {
    test('only forwards platform variables and forces internal resources', () => {
        const env = buildStackEnvironment({
            mode: 'e2e',
            source: { PATH: 'tools', RANDOM_CREDENTIAL: 'sentinel', CI: 'true' },
            overrides: { E2E_MAILHOG_UI_PORT: '18026' },
        });
        expect(env.PATH).toBe('tools');
        expect(env.CI).toBe('true');
        expect(env.RANDOM_CREDENTIAL).toBeUndefined();
        expect(env.E2E_MAILHOG_UI_PORT).toBe('18026');
        expect(env.DATABASE_URL).toBe('mysql://root:root@mysql:3306/convex_self_hosted');
        expect(env.CONVEX_DEPLOY_KEY).toBe('');
    });
    test.each(['CONVEX_DEPLOY_KEY', 'CONVEX_DEPLOYMENT', 'AWS_ACCESS_KEY_ID', 'S3_ENDPOINT_URL'])(
        'rejects %s before running E2E',
        key => {
            expect(() =>
                buildStackEnvironment({ mode: 'e2e', source: { [key]: 'external-sentinel' } })
            ).toThrow(key);
        }
    );
    test.each(['NEXT_PUBLIC_CONVEX_URL', 'DATABASE_URL', 'SMTP_HOST'])(
        'rejects external resource override %s',
        key => {
            expect(() =>
                buildStackEnvironment({
                    mode: 'e2e',
                    source: {},
                    overrides: { [key]: 'https://external.example' },
                })
            ).toThrow();
        }
    );
    test('rejects loopback URLs containing embedded credentials', () => {
        expect(() =>
            buildStackEnvironment({
                mode: 'e2e',
                source: {},
                overrides: { SITE_URL: 'http://secret@127.0.0.1:3000' },
            })
        ).toThrow();
    });
    test('redacts known secrets and self-hosted credentials', () => {
        expect(
            redactSensitiveText('secret-sentinel convex-self-hosted|key-value', ['secret-sentinel'])
        ).not.toMatch(/secret-sentinel|key-value/);
    });
    test('redacts quoted JSON credentials and authorization headers', () => {
        const log =
            '{"password":"synthetic-password","token":"synthetic-token"}\nAuthorization: Bearer eyJ.synthetic.signature\nCookie: session=synthetic-cookie';
        const redacted = redactSensitiveText(log);
        expect(redacted).not.toMatch(
            /synthetic-password|synthetic-token|eyJ\.synthetic|synthetic-cookie/
        );
        expect(redacted).toContain('[REDACTED]');
    });
    test('a failed command cannot expose its stdin secret through error output', async () => {
        const sentinel = 'stdin-secret-sentinel';
        const result = runCommandWithInput(
            process.execPath,
            [
                '-e',
                'let value="";process.stdin.on("data",c=>value+=c);process.stdin.on("end",()=>{process.stderr.write(value);process.exit(2)})',
            ],
            sentinel,
            { sensitiveValues: [sentinel] }
        );
        await expect(result).rejects.toThrow('[REDACTED]');
        await result.catch(error => expect(String(error)).not.toContain(sentinel));
    });
});
