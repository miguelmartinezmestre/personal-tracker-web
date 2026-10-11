type AuthClientError = {
    code?: string;
    message?: string;
    statusText?: string;
};

export function throwIfAuthClientError(response: { error: AuthClientError | null }): void {
    if (!response.error) {
        return;
    }

    // Keep the Better Auth error as the cause so its `code` can be mapped to a translated message.
    throw new Error(response.error.message || response.error.statusText || 'Request failed', {
        cause: response.error,
    });
}
