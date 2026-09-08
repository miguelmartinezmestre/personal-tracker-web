import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Convex dev writes frontend URLs even when deployment credentials come from process env. */
export async function preserveDeveloperEnv<T>(operation: () => Promise<T>): Promise<T> {
    const files = ['.env', '.env.local'].map(name => {
        const path = resolve(name);
        if (existsSync(path) && !lstatSync(path).isFile()) {
            throw new Error(`Expected a regular local environment file: ${name}`);
        }
        return { path, before: existsSync(path) ? readFileSync(path) : null };
    });
    try {
        return await operation();
    } finally {
        for (const file of files) {
            if (file.before !== null) {
                writeFileSync(file.path, file.before);
            } else if (existsSync(file.path)) {
                unlinkSync(file.path);
            }
        }
    }
}
