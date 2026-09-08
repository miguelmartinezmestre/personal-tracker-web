import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, runCommandCapture } from './lib/command';

const packageSchema = z.object({
    name: z.string(),
    versions: z.array(z.string()),
    license: z.string().optional(),
    author: z.string().optional(),
    homepage: z.string().optional(),
    description: z.string().optional(),
});

async function main() {
    const raw = await runCommandCapture(PNPM_COMMAND, ['licenses', 'list', '--json'], {
        shell: USE_SHELL_FOR_PNPM,
    });
    const groups = z.record(z.string(), z.array(z.unknown())).parse(JSON.parse(raw));
    const licenses = Object.fromEntries(
        Object.entries(groups)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([license, packages]) => [
                license,
                packages
                    .map(value => {
                        const parsed = packageSchema.parse(value);
                        return { ...parsed, license: parsed.license ?? license };
                    })
                    .sort((left, right) => left.name.localeCompare(right.name)),
            ])
    );
    const output = process.argv[2] ?? 'reports/verification/licenses.json';
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(licenses, null, 2)}\n`);
    console.log(`Wrote ${Object.keys(licenses).length} license groups to ${output}`);
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'License inventory generation failed');
    process.exitCode = 1;
});
