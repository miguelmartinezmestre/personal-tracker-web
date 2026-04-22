/**
 * Spawns 3 Playwright runs (chromium, firefox, webkit project groups) in parallel
 * after a single setup run — same Convex + Next server, faster wall time than
 * serial project order.
 */

import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'node:child_process';
import process from 'node:process';

interface RunCommandOptions extends SpawnOptionsWithoutStdio {
    ignoreExitCode?: boolean;
}

const PNPM_COMMAND = 'pnpm';
const USE_SHELL_FOR_PNPM = process.platform === 'win32';

const DEFAULT_PLAYWRIGHT_CONFIG = '--config=playwright.full.config.ts';
const CROSS_BROWSER_CONFIG_PATH = 'playwright.cross-browser.config.ts';
const FULL_CONFIG_PATH = 'playwright.full.config.ts';

/**
 * Returns exit code (0 = success). Uses inherit stdio.
 */
function runCommandGetExit(
    command: string,
    args: string[],
    options: RunCommandOptions = {}
): Promise<number> {
    const { ignoreExitCode = false, ...spawnOptions } = options;

    return new Promise((resolve, reject) => {
        const child: ChildProcess = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: 'inherit',
            ...spawnOptions,
        });

        child.on('error', error => {
            reject(error);
        });

        child.on('close', (code, signal) => {
            if (ignoreExitCode) {
                resolve(0);
                return;
            }
            const exit = code === null && signal ? 1 : (code ?? 0);
            resolve(exit);
        });
    });
}

function extractConfigArgFromForwarded(args: string[]): string {
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--config' && args[i + 1]) {
            return `--config=${args[i + 1]}`;
        }
        if (a?.startsWith('--config=')) {
            return a;
        }
    }
    return DEFAULT_PLAYWRIGHT_CONFIG;
}

function forwardedArgsWithoutConfig(args: string[]): string[] {
    const out: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === undefined) {
            continue;
        }
        if (a === '--config') {
            i += 1;
            continue;
        }
        if (a.startsWith('--config=')) {
            continue;
        }
        out.push(a);
    }
    return out;
}

function resolveBrowserProjectGroups(configArg: string): string[][] {
    if (configArg.includes(CROSS_BROWSER_CONFIG_PATH)) {
        return [
            ['--project=chromium', '--project=chromium-auth-smoke'],
            ['--project=firefox-compat'],
            ['--project=webkit-compat'],
        ];
    }

    if (configArg.includes(FULL_CONFIG_PATH)) {
        return [
            ['--project=chromium', '--project=chromium-auth-smoke'],
            ['--project=firefox', '--project=firefox-auth-smoke'],
            ['--project=webkit', '--project=webkit-auth-smoke'],
        ];
    }

    return [['--project=chromium']];
}

/**
 * When true, run the three browser stacks in parallel (same BACKEND) instead of serial project order.
 * Disable with E2E_PARALLEL_BROWSERS=false.
 */
export function shouldRunParallelBrowserPlaywright(args: string[]): boolean {
    if (process.env.E2E_PARALLEL_BROWSERS === 'false') {
        return false;
    }
    for (const a of args) {
        if (a === '--list' || a === '--ui' || a === '--debug' || a === '--last-failed') {
            return false;
        }
        if (a === '-g' || a.startsWith('--grep') || a.startsWith('--project')) {
            return false;
        }
        if (a === '--config' || a.startsWith('--config=')) {
            continue;
        }
        if (a === '--' || a.endsWith('.ts')) {
            return false;
        }
    }
    return true;
}

export async function runParallelBrowserPlaywright(
    commandEnv: NodeJS.ProcessEnv,
    forwarded: string[]
): Promise<void> {
    const configArg = extractConfigArgFromForwarded(forwarded);
    const extra = forwardedArgsWithoutConfig(forwarded);
    const browserProjectGroups = resolveBrowserProjectGroups(configArg);

    console.log('Running E2E setup project...');
    const setupCode = await runCommandGetExit(
        PNPM_COMMAND,
        ['exec', 'playwright', 'test', configArg, '--project=setup', ...extra],
        { env: commandEnv, shell: USE_SHELL_FOR_PNPM }
    );
    if (setupCode !== 0) {
        throw new Error(`Playwright setup project failed with exit code ${String(setupCode)}`);
    }

    console.log(
        'Running E2E browser projects in parallel (3 invocations: chromium, firefox, webkit)...'
    );

    // Setup already ran above; child projects list [setup] as a dependency. Without
    // --no-deps, each parallel run re-executes setup and /api/test/setup-platform hits
    // PLATFORM_ALREADY_CONFIGURED.
    const results = await Promise.all(
        browserProjectGroups.map(async (projects, index) => {
            const label = `browser-${String(index + 1)}`;
            console.log(`[${label}] --no-deps ${projects.join(' ')}`);
            const code = await runCommandGetExit(
                PNPM_COMMAND,
                ['exec', 'playwright', 'test', configArg, '--no-deps', ...projects, ...extra],
                { env: commandEnv, shell: USE_SHELL_FOR_PNPM }
            );
            return { label, code };
        })
    );

    const failed = results.filter(r => r.code !== 0);
    if (failed.length > 0) {
        const details = failed.map(r => `${r.label} exit ${String(r.code)}`).join(', ');
        throw new Error(`Parallel browser Playwright runs failed: ${details}`);
    }
}
