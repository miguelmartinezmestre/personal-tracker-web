export type LLMProvider =
    | 'chatgpt' // https://chatgpt.com/?q=...
    | 'copilot' // https://www.bing.com/chat?q=...&sendquery=1
    | 'claude' // https://claude.ai/new?q=...
    | 'perplexity'; // https://www.perplexity.ai/search?q=...

export function buildLLMDeepLink(provider: LLMProvider, message: string): string {
    const defaults: Record<LLMProvider, { base: string; path: string }> = {
        chatgpt: { base: 'https://chatgpt.com', path: '/' },
        copilot: { base: 'https://www.bing.com', path: '/chat' },
        claude: { base: 'https://claude.ai', path: '/new' },
        perplexity: { base: 'https://www.perplexity.ai', path: '/search' },
    };

    const def = defaults[provider];
    const baseUrl = def.base.replace(/\/+$/, '');
    const url = new URL(baseUrl + def.path);

    switch (provider) {
        case 'chatgpt': {
            url.searchParams.set('q', message);
            break;
        }
        case 'copilot': {
            url.searchParams.set('q', message);
            break;
        }
        case 'claude': {
            url.searchParams.set('q', message);
            break;
        }
        case 'perplexity': {
            url.searchParams.set('q', message);
            break;
        }
    }

    return url.toString();
}
