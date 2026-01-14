import { describe, it, expect } from 'vitest';

import { buildLLMDeepLink } from './llm-links';

describe('buildLLMDeepLink', () => {
    const message = 'hola mundo';

    const cases = [
        {
            provider: 'chatgpt' as const,
            host: 'chatgpt.com',
            path: '/',
        },
        {
            provider: 'copilot' as const,
            host: 'www.bing.com',
            path: '/chat',
        },
        {
            provider: 'claude' as const,
            host: 'claude.ai',
            path: '/new',
        },
        {
            provider: 'perplexity' as const,
            host: 'www.perplexity.ai',
            path: '/search',
        },
    ];

    it('builds links with correct base and query', () => {
        for (const testCase of cases) {
            const url = new URL(buildLLMDeepLink(testCase.provider, message));

            expect(url.hostname).toBe(testCase.host);
            expect(url.pathname).toBe(testCase.path);
            expect(url.searchParams.get('q')).toBe(message);
        }
    });
});
