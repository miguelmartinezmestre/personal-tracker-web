import { expect, test } from 'vitest';
import { describeUserAgent } from './user-agent';

test.each([
    [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        { device: 'desktop', browser: 'Chrome', system: 'macOS' },
    ],
    [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        { device: 'mobile', browser: 'Safari', system: 'iOS' },
    ],
    [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
        { device: 'desktop', browser: 'Edge', system: 'Windows' },
    ],
])('reads the device, browser and system of a session @INH-AUT-09', (userAgent, expected) => {
    expect(describeUserAgent(userAgent)).toEqual(expected);
});
