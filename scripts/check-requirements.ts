import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { z } from 'zod';
import { unknownRequirementTags } from './lib/requirement-tags';

const catalog = z
    .object({
        expectedCount: z.literal(77),
        requirements: z.array(
            z.object({
                id: z.string().regex(/^REQ-[A-Z]+-\d{3}$/),
                evidence: z.array(z.object({ kind: z.string(), path: z.string() })).min(1),
            })
        ),
    })
    .parse(JSON.parse(readFileSync('docs/requirements.json', 'utf8')));
const known = new Set(catalog.requirements.map(item => item.id));
const failures: string[] = [];
if (catalog.requirements.length !== 77 || known.size !== 77) {
    failures.push('The requirement catalog must contain exactly 77 distinct identifiers');
}
for (const requirement of catalog.requirements) {
    for (const evidence of requirement.evidence) {
        const target = resolve(evidence.path);
        if (!target.startsWith(process.cwd() + sep) || !existsSync(target)) {
            failures.push(`${requirement.id}: missing or external evidence ${evidence.path}`);
        }
    }
}
function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) {
            inspect(file);
        } else if (entry.name.endsWith('.ts')) {
            for (const id of unknownRequirementTags(readFileSync(file, 'utf8'), known)) {
                failures.push(`${file}: unknown requirement ${id}`);
            }
        }
    }
}
inspect('tests');
if (failures.length) {
    throw new Error(failures.join('\n'));
}
mkdirSync('reports/verification', { recursive: true });
writeFileSync(
    'reports/verification/requirements.json',
    JSON.stringify(
        {
            checkedAt: new Date().toISOString(),
            mappedRequirements: known.size,
            unknownIdentifiers: [],
            missingEvidenceFiles: [],
            scope: 'Traceability structure, not a claim of acceptance or user evaluation',
        },
        null,
        2
    ) + '\n'
);
console.log('77 requirements mapped; all references exist; no unknown E2E identifiers.');
