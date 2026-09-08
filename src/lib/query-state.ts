export type QueryState<T> =
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'empty' }
    | { status: 'ready'; data: T };

export function queryState<T>(
    query: { data: T | undefined; isLoading: boolean; isError: boolean; error?: unknown },
    isEmpty: (data: T) => boolean
): QueryState<T> {
    if (query.isError) {
        return { status: 'error', error: query.error };
    }
    if (query.isLoading || query.data === undefined) {
        return { status: 'loading' };
    }
    return isEmpty(query.data) ? { status: 'empty' } : { status: 'ready', data: query.data };
}
