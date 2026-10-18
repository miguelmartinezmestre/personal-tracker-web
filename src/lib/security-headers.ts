export function securityHeaders(options: {
    nonce: string;
    siteUrl: string;
    convexUrl: string;
    development: boolean;
}) {
    const site = new URL(options.siteUrl);
    const backend = new URL(options.convexUrl);
    const websocket = new URL(backend);
    websocket.protocol = backend.protocol === 'https:' ? 'wss:' : 'ws:';
    const localWebsocket = new URL(site);
    localWebsocket.protocol = site.protocol === 'https:' ? 'wss:' : 'ws:';

    const directives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${options.nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        `connect-src 'self' ${backend.origin} ${websocket.origin}${options.development ? ` ${localWebsocket.origin}` : ''}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ];

    if (site.protocol === 'https:' && !options.development) {
        directives.push('upgrade-insecure-requests');
    }

    return {
        'Content-Security-Policy': directives.join('; '),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
}
