import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { PNPM_COMMAND, USE_SHELL_FOR_PNPM, runCommandCapture } from './lib/command';

const nodeSchema = z.object({
    name: z.string().optional(),
    version: z.string().optional(),
    dependencies: z.record(z.string(), z.unknown()).optional(),
    devDependencies: z.record(z.string(), z.unknown()).optional(),
    optionalDependencies: z.record(z.string(), z.unknown()).optional(),
});

async function main() {
    const project = z
        .object({ name: z.string(), version: z.string() })
        .parse(JSON.parse(readFileSync('package.json', 'utf8')));
    const raw = await runCommandCapture(PNPM_COMMAND, ['list', '--depth', 'Infinity', '--json'], {
        shell: USE_SHELL_FOR_PNPM,
    });
    const roots = z.array(z.unknown()).parse(JSON.parse(raw));
    const components = new Map<
        string,
        { type: 'library'; name: string; version: string; purl: string; 'bom-ref': string }
    >();
    const dependencies = new Map<string, Set<string>>();
    const projectRef = `pkg:npm/${encodeURIComponent(project.name)}@${project.version}`;

    function visit(value: unknown, fallbackName: string, parent: string, ancestors: Set<string>) {
        const node = nodeSchema.parse(value);
        const name = node.name ?? fallbackName;
        const ref = node.version
            ? `pkg:npm/${name.startsWith('@') ? `%40${name.slice(1)}` : name}@${node.version}`
            : parent;
        if (!dependencies.has(ref)) {
            dependencies.set(ref, new Set());
        }
        if (ref !== parent && node.version) {
            components.set(ref, {
                type: 'library',
                name,
                version: node.version,
                purl: ref,
                'bom-ref': ref,
            });
            const links = dependencies.get(parent) ?? new Set<string>();
            links.add(ref);
            dependencies.set(parent, links);
        }
        if (ancestors.has(ref)) return;
        const next = new Set(ancestors).add(ref);
        for (const [childName, child] of Object.entries({
            ...node.dependencies,
            ...node.devDependencies,
            ...node.optionalDependencies,
        })) {
            visit(child, childName, ref, next);
        }
    }
    for (const root of roots) visit(root, project.name, projectRef, new Set());
    components.delete(projectRef);
    const output = process.argv[2] ?? 'artifacts/sbom.cdx.json';
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(
        output,
        JSON.stringify(
            {
                bomFormat: 'CycloneDX',
                specVersion: '1.6',
                serialNumber: `urn:uuid:${randomUUID()}`,
                version: 1,
                metadata: {
                    timestamp: new Date().toISOString(),
                    component: {
                        type: 'application',
                        name: project.name,
                        version: project.version,
                        'bom-ref': projectRef,
                    },
                },
                components: [...components.values()].sort((a, b) => a.purl.localeCompare(b.purl)),
                dependencies: [...dependencies].map(([ref, dependsOn]) => ({
                    ref,
                    dependsOn: [...dependsOn].sort(),
                })),
            },
            null,
            2
        )
    );
    console.log(`Wrote ${components.size} components to ${output}`);
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'SBOM generation failed');
    process.exitCode = 1;
});
