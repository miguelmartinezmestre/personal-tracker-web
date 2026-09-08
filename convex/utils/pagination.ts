import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from './constants';

const INVALID_CURSOR_ERROR = 'InvalidCursor';
const MALFORMED_CURSOR_ERROR = 'is not valid JSON';

export const MAX_PAGE_ITEMS = 100;
export const MAX_PAGE_ROWS_READ = 500;
export const MAX_PAGE_BYTES_READ = 4 * 1024 * 1024;

function boundedPositiveInteger(value: number | undefined, fallback: number, maximum: number) {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    return Math.min(value, maximum);
}

/**
 * `paginationOptsValidator` validates shape, not cost. Apply server-owned read
 * ceilings so a caller cannot request an oversized initial/reactive page.
 */
export function withPaginationLimits(paginationOpts: PaginationOptions): PaginationOptions {
    return {
        ...paginationOpts,
        numItems: boundedPositiveInteger(paginationOpts.numItems, MAX_PAGE_ITEMS, MAX_PAGE_ITEMS),
        maximumRowsRead: boundedPositiveInteger(
            paginationOpts.maximumRowsRead,
            MAX_PAGE_ROWS_READ,
            MAX_PAGE_ROWS_READ
        ),
        maximumBytesRead: boundedPositiveInteger(
            paginationOpts.maximumBytesRead,
            MAX_PAGE_BYTES_READ,
            MAX_PAGE_BYTES_READ
        ),
    };
}

export function isInvalidCursorError(error: Error | string | null | undefined): boolean {
    if (error instanceof Error) {
        return (
            error.message.includes(INVALID_CURSOR_ERROR) ||
            error.message.includes(MALFORMED_CURSOR_ERROR)
        );
    }

    if (!error) {
        return false;
    }

    return error.includes(INVALID_CURSOR_ERROR) || error.includes(MALFORMED_CURSOR_ERROR);
}

export async function withInvalidCursorRetry<T>(
    paginationOpts: PaginationOptions,
    queryPage: (paginationOpts: PaginationOptions) => Promise<T>
): Promise<T> {
    let normalizedOptions = withPaginationLimits(paginationOpts);
    if (paginationOpts.cursor && !paginationOpts.cursor.startsWith('vp1.')) {
        try {
            JSON.parse(paginationOpts.cursor);
        } catch {
            // Convex allows only one .paginate() call per function execution,
            // including failed calls. Reject obviously malformed cursors before
            // touching the database so the same execution can safely start over.
            normalizedOptions = { ...normalizedOptions, cursor: null };
        }
    }

    return await queryPage(normalizedOptions);
}
