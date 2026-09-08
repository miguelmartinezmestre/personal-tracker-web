import process from 'node:process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, runCommand, redactSensitiveText } from './lib/command';

type Step = { name: string; args: string[] };
const types: Step[] = [
    {
        name: 'Frontend test types',
        args: ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.frontend-tests.json'],
    },
    { name: 'Application types', args: ['exec', 'tsc', '--noEmit'] },
    { name: 'Backend test types', args: ['exec', 'tsc', '--noEmit', '-p', 'convex/tsconfig.json'] },
    {
        name: 'Playwright types',
        args: ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.playwright.json'],
    },
    { name: 'Script types', args: ['exec', 'tsc', '--noEmit', '-p', 'scripts/tsconfig.json'] },
];
const tests: Step[] = [
    { name: 'Backend tests', args: ['exec', 'vitest', 'run'] },
    {
        name: 'Frontend tests',
        args: ['exec', 'vitest', 'run', '--config', 'vitest.frontend.config.ts'],
    },
];
const checks: Step[] = [
    { name: 'Formatting', args: ['exec', 'prettier', '.', '--check', '--ignore-unknown'] },
    ...types,
    { name: 'Lint', args: ['exec', 'node', 'scripts/run-lint.mjs'] },
    ...tests,
    { name: 'Unused code', args: ['exec', 'knip'] },
    { name: 'Translations', args: ['exec', 'tsx', 'scripts/check-translations.ts'] },
    { name: 'Convex contracts', args: ['exec', 'tsx', 'scripts/check-convex-contracts.ts'] },
    { name: 'Requirement traceability', args: ['exec', 'tsx', 'scripts/check-requirements.ts'] },
    { name: 'Peer dependencies', args: ['peers', 'check'] },
];

async function main() {
    const target = process.argv[2] ?? 'checks';
    let steps: Step[];
    if (target === 'types') steps = types;
    else if (target === 'test') steps = tests;
    else if (target === 'coverage')
        steps = tests.map(step => ({ ...step, args: [...step.args, '--coverage'] }));
    else if (target === 'checks') steps = checks;
    else if (target === 'checks-e2e')
        steps = [
            ...checks,
            { name: 'End-to-end tests', args: ['exec', 'tsx', 'scripts/run-e2e-stack.ts'] },
        ];
    else if (target === 'ci')
        steps = [
            ...checks,
            { name: 'Production build', args: ['exec', 'next', 'build'] },
            { name: 'End-to-end tests', args: ['exec', 'tsx', 'scripts/run-e2e-stack.ts'] },
        ];
    else throw new Error(`Unknown quality target: ${target}`);
    const results: {
        name: string;
        status: 'running' | 'passed' | 'failed';
        startedAt: string;
        durationMs?: number;
        log: string;
    }[] = [];
    mkdirSync('reports/quality', { recursive: true });
    const saveResults = () =>
        writeFileSync(
            `reports/quality/${target}.json`,
            JSON.stringify({ target, results }, null, 2) + '\n'
        );
    for (const step of steps) {
        console.log(`\n${step.name}`);
        const started = Date.now();
        const result: (typeof results)[number] = {
            name: step.name,
            status: 'running',
            startedAt: new Date(started).toISOString(),
            log: `reports/quality/${target}-${step.name.toLowerCase().replaceAll(' ', '-')}.log`,
        };
        results.push(result);
        saveResults();
        try {
            await runCommand(PNPM_COMMAND, step.args, {
                env: process.env,
                shell: USE_SHELL_FOR_PNPM,
                logFile: result.log,
            });
            result.status = 'passed';
        } catch (error) {
            result.status = 'failed';
            throw error;
        } finally {
            result.durationMs = Date.now() - started;
            saveResults();
        }
    }
}

main().catch(error => {
    console.error(
        redactSensitiveText(error instanceof Error ? error.message : 'Quality checks failed')
    );
    process.exitCode = 1;
});
