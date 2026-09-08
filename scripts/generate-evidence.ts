import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Evidence = { path: string; bytes: number; sha256: string };
const files: Evidence[] = [];
function collect(directory: string) {
    if (!existsSync(directory)) {
        return;
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) {
            continue;
        }
        const file = join(directory, entry.name);
        if (entry.isDirectory()) {
            collect(file);
        } else if (entry.isFile() && entry.name !== 'evidence-manifest.json') {
            files.push({
                path: file.replaceAll('\\', '/'),
                bytes: statSync(file).size,
                sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
            });
        }
    }
}
for (const directory of [
    'reports/verification',
    'reports/quality',
    'reports/e2e',
    'coverage',
    'playwright-report',
    'test-results',
]) {
    collect(directory);
}
const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const manifest = {
    generatedAt: new Date().toISOString(),
    applicationCommit: git(['rev-parse', 'HEAD']),
    workingTreeDirty: Boolean(git(['status', '--porcelain', '--untracked-files=no'])),
    node: process.versions.node,
    platform: process.platform,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/evidence-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Recorded SHA-256 hashes for ${files.length} evidence files.`);
