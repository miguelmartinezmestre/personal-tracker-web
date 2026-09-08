import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);

function packageBinary(name) {
    const manifestPath = require.resolve(`${name}/package.json`);
    const manifest = require(manifestPath);
    const binary = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[name];
    if (!binary) throw new Error(`Missing executable for ${name}`);
    return resolve(dirname(manifestPath), binary);
}

const commands = [
    ['oxlint', ['--deny-warnings', '--tsconfig', 'tsconfig.lint.json']],
    ['eslint', ['convex', '--max-warnings=0']],
];

let exitCode = 0;

for (const [command, args] of commands) {
    const result = spawnSync(process.execPath, [packageBinary(command), ...args], {
        stdio: 'inherit',
        shell: false,
    });

    if (result.error || result.status !== 0) {
        console.error(
            `${command} failed: ${result.error?.message ?? result.signal ?? result.status}`
        );
        exitCode = result.status || 1;
    }
}

process.exit(exitCode);
