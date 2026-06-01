import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

//This script is used to check if the Playwright tests are using the UI, not direct API/HTTP calls because we are simulating the user's actions.

const testsRoot = join(process.cwd(), 'tests');

const forbiddenPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bpage\.request\b/, label: 'page.request direct HTTP client' },
    { pattern: /\b\w+\.request\b/, label: 'Playwright request fixture/client' },
    { pattern: /\bfetch\s*\(/, label: 'fetch direct HTTP call' },
    { pattern: /\bConvexHttpClient\b/, label: 'Convex HTTP client' },
    { pattern: /['"`]\/api\//, label: 'direct API route literal' },
    { pattern: /\bcreateTestUserViaAPI\b/, label: 'API-based user helper' },
    { pattern: /\bsetupPlatformAsAdmin\b/, label: 'API-based admin setup helper' },
    { pattern: /\bpromoteToAdmin\b/, label: 'API-based admin promotion helper' },
];

function collectTestFiles(directory: string): string[] {
    const entries = readdirSync(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectTestFiles(path));
            continue;
        }

        if (entry.isFile() && path.endsWith('.ts')) {
            files.push(path);
        }
    }

    return files;
}

const violations = collectTestFiles(testsRoot).flatMap(file => {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    return lines.flatMap((line, index) =>
        forbiddenPatterns
            .filter(({ pattern }) => pattern.test(line))
            .map(({ label }) => ({
                file,
                line: index + 1,
                label,
                source: line.trim(),
            }))
    );
});

if (violations.length > 0) {
    console.error('Playwright tests must use the UI, not direct API/HTTP calls.\n');
    for (const violation of violations) {
        console.error(
            `${violation.file}:${violation.line} - ${violation.label}: ${violation.source}`
        );
    }
    process.exit(1);
}

console.log('Playwright UI-only guard passed.');
