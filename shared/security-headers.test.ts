import { expect, test } from 'vitest';
import { securityHeaders } from './security-headers';

test('production CSP permits the configured subscription endpoint and nonce without eval', () => {
    const result = securityHeaders({
        nonce: 'synthetic-nonce',
        siteUrl: 'https://app.example',
        convexUrl: 'https://example.convex.cloud',
        development: false,
    });
    expect(result['Content-Security-Policy']).toContain("'nonce-synthetic-nonce'");
    expect(result['Content-Security-Policy']).toContain('wss://example.convex.cloud');
    expect(result['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(result['Content-Security-Policy']).toContain("frame-ancestors 'none'");
});

test('a production build on loopback does not force local requests to HTTPS', () => {
    const result = securityHeaders({
        nonce: 'synthetic-nonce',
        siteUrl: 'http://127.0.0.1:4300',
        convexUrl: 'http://127.0.0.1:4210',
        development: false,
    });
    expect(result['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
    expect(result['Content-Security-Policy']).toContain('ws://127.0.0.1:4210');
});
