import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const credentialsSchema = z.object({
    mysqlRootPassword: z.string().min(1),
    betterAuthSecret: z.string().min(1).optional(),
    jwks: z.string().min(1).optional(),
});

export type LocalStackCredentials = z.infer<typeof credentialsSchema>;

export function readLocalStackCredentials(root: string): LocalStackCredentials | undefined {
    const path = join(root, '.local-stack', 'credentials.json');
    if (!existsSync(path)) return undefined;
    try {
        return credentialsSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    } catch {
        throw new Error(
            'Invalid local stack credentials file; preserve it before repairing local configuration'
        );
    }
}

export function writeLocalStackCredentials(root: string, credentials: LocalStackCredentials): void {
    const directory = join(root, '.local-stack');
    mkdirSync(directory, { recursive: true });
    writeFileSync(
        join(directory, 'credentials.json'),
        JSON.stringify(credentialsSchema.parse(credentials)),
        { mode: 0o600 }
    );
}
