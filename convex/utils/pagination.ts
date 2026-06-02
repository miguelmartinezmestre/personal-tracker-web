import type { PaginationOptions } from 'convex/server';

const INVALID_CURSOR_ERROR = 'InvalidCursor';
const MALFORMED_CURSOR_ERROR = 'is not valid JSON';

export function isInvalidCursorError(error: unknown): boolean {
    if (error instanceof Error) {
        return (
            error.message.includes(INVALID_CURSOR_ERROR) ||
            error.message.includes(MALFORMED_CURSOR_ERROR)
        );
    }

    const message = String(error);
    return message.includes(INVALID_CURSOR_ERROR) || message.includes(MALFORMED_CURSOR_ERROR);
}

export async function withInvalidCursorRetry<T>(
    paginationOpts: PaginationOptions,
    queryPage: (paginationOpts: PaginationOptions) => Promise<T>
): Promise<T> {
    try {
        return await queryPage(paginationOpts);
    } catch (error) {
        if (!paginationOpts.cursor || !isInvalidCursorError(error)) {
            throw error;
        }

        return await queryPage({ ...paginationOpts, cursor: null });
    }
}
