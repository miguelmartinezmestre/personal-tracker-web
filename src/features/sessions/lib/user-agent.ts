export type DeviceKind = 'mobile' | 'tablet' | 'desktop' | 'bot';

// Only the device, browser and system are read from the agent; sessions are never geolocated.
const BROWSERS: [RegExp, string][] = [
    [/edg\//i, 'Edge'],
    [/opr\/|opera/i, 'Opera'],
    [/firefox|fxios/i, 'Firefox'],
    [/chrome|crios/i, 'Chrome'],
    [/safari/i, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
    [/windows/i, 'Windows'],
    [/iphone|ipad|ipod/i, 'iOS'],
    [/android/i, 'Android'],
    [/mac os x|macintosh/i, 'macOS'],
    [/linux/i, 'Linux'],
];

const firstMatch = (userAgent: string, candidates: [RegExp, string][]) =>
    candidates.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

export function describeUserAgent(userAgent: string) {
    let device: DeviceKind = 'desktop';

    if (/bot|crawler|spider/i.test(userAgent)) {
        device = 'bot';
    } else if (/ipad|tablet/i.test(userAgent)) {
        device = 'tablet';
    } else if (/mobi|iphone|android/i.test(userAgent)) {
        device = 'mobile';
    }

    return {
        device,
        browser: firstMatch(userAgent, BROWSERS),
        system: firstMatch(userAgent, SYSTEMS),
    };
}
