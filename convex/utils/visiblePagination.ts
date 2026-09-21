import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { ConvexError } from 'convex/values';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { z } from 'zod';
import { withPaginationLimits } from './pagination';

const cursorSchema = z.object({
    scope: z.string(),
    cursor: z.string().nullable(),
    done: z.boolean(),
    pending: z.array(z.string()).max(600),
    collected: z.array(z.string()).max(101),
    fingerprints: z.record(z.string(), z.string()).optional(),
});
type Cursor = z.infer<typeof cursorSchema>;

function encryptionKey(): string {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
        throw new ConvexError('INTERNAL_ERROR');
    }
    return `visible-pagination-v1:${secret}`;
}

async function decodeCursor(cursor: string | null, scope: string): Promise<Cursor> {
    if (!cursor || !cursor.startsWith('vp1.')) {
        return { scope, cursor: null, done: false, pending: [], collected: [] };
    }
    try {
        if (cursor.length > 1_000_000) {
            throw new Error('Cursor too large');
        }
        const decoded = cursorSchema.parse(
            JSON.parse(await symmetricDecrypt({ key: encryptionKey(), data: cursor.slice(4) }))
        );
        if (decoded.scope !== scope) {
            throw new Error('Cursor scope changed');
        }
        return decoded;
    } catch {
        throw new ConvexError('INVALID_CURSOR');
    }
}

export type VisiblePage<T> = PaginationResult<T> & { needsContinuation: boolean };

export async function paginateVisible<T extends { _id: string }>(options: {
    scope: string;
    paginationOpts: PaginationOptions;
    fetchPage: (paginationOpts: PaginationOptions) => Promise<PaginationResult<T>>;
    get: (id: string) => Promise<T | null>;
    accepts: (document: T) => Promise<boolean> | boolean;
    fingerprint?: (document: T) => string;
}): Promise<VisiblePage<T>> {
    const limits = withPaginationLimits(options.paginationOpts);
    const state = await decodeCursor(limits.cursor, options.scope);
    if (limits.cursor && options.fingerprint && !state.fingerprints) {
        throw new ConvexError('INVALID_CURSOR');
    }
    const fingerprints = new Map(Object.entries(state.fingerprints ?? {}));
    const budget = limits.maximumRowsRead ?? 500;
    const page: T[] = [];
    const seen = new Set<string>();
    const cache = new Map<string, T>();
    let reads = 0;
    const pending = [...state.collected, ...state.pending];

    async function consume(): Promise<void> {
        while (pending.length && page.length <= limits.numItems) {
            const id = pending[0];
            if (!id) {
                break;
            }
            if (!cache.has(id) && reads >= budget) {
                break;
            }
            pending.shift();
            if (seen.has(id)) {
                continue;
            }
            seen.add(id);
            const cached = cache.get(id);
            if (!cached) {
                reads++;
            }
            const document = cached ?? (await options.get(id));
            if (document && options.fingerprint) {
                const current = options.fingerprint(document);
                const previous = fingerprints.get(id);
                if (previous !== undefined && previous !== current) {
                    throw new ConvexError('INVALID_CURSOR');
                }
                fingerprints.set(id, current);
            }
            if (document && (await options.accepts(document))) {
                page.push(document);
            }
        }
    }

    await consume();
    if (pending.length === 0 && page.length <= limits.numItems && !state.done && reads < budget) {
        const result = await options.fetchPage({
            ...limits,
            cursor: state.cursor,
            numItems: budget - reads,
            maximumRowsRead: budget - reads,
        });
        state.cursor = result.continueCursor;
        state.done = result.isDone;
        reads += result.page.length;
        for (const document of result.page) {
            if (options.fingerprint) {
                fingerprints.set(document._id, options.fingerprint(document));
            }
            cache.set(document._id, document);
            pending.push(document._id);
        }
        await consume();
    }

    const hasNext = page.length > limits.numItems;
    const isDone = state.done && pending.length === 0 && !hasNext;
    const needsContinuation = !hasNext && !isDone;
    const visible = page.slice(0, limits.numItems);
    const extra = hasNext ? page.slice(limits.numItems).map(document => document._id) : [];
    const next: Cursor = {
        scope: options.scope,
        cursor: state.cursor,
        done: state.done,
        pending: [...extra, ...pending],
        collected: needsContinuation ? visible.map(document => document._id) : [],
    };
    if (options.fingerprint) {
        const buffered = new Set([...next.pending, ...next.collected]);
        next.fingerprints = Object.fromEntries(
            [...fingerprints].filter(([id]) => buffered.has(id))
        );
    }
    const continueCursor = isDone
        ? ''
        : `vp1.${await symmetricEncrypt({ key: encryptionKey(), data: JSON.stringify(next) })}`;
    return { page: visible, continueCursor, isDone, needsContinuation };
}
