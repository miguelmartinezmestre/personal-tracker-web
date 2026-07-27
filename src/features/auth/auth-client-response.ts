type AuthClientError = {
    message?: string;
    statusText?: string;
};

/**
 * Better Auth client calls resolve to `{ data, error }` by default, including
 * HTTP failures. Convert that transport contract into normal promise
 * rejection semantics before handing the result to React Query or UI flows.
 */
export function throwIfAuthClientError(response: { error: AuthClientError | null }): void {
    if (!response.error) return;

    throw new Error(response.error.message || response.error.statusText || 'Request failed');
}
