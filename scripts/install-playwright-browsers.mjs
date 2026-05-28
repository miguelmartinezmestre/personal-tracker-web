import { spawnSync } from 'node:child_process';
import process from 'node:process';

function isEnabled(value) {
    if (value === undefined || value === '') {
        return false;
    }

    return !['0', 'false'].includes(value.toLowerCase());
}

if (isEnabled(process.env.CI) || isEnabled(process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD)) {
    console.log(
        'Skipping Playwright browser installation because CI or PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD is set.'
    );
    process.exit(0);
}

const result = spawnSync('pnpm', ['exec', 'playwright', 'install'], {
    shell: process.platform === 'win32',
    stdio: 'inherit',
});

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 1);
