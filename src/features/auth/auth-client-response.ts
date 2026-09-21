type AuthClientError = {
    message?: string;
    statusText?: string;
};

export function throwIfAuthClientError(response: { error: AuthClientError | null }): void {
    if (!response.error) {
        return;
    }

    throw new Error(response.error.message || response.error.statusText || 'Request failed');
}
