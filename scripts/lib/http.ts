export function buildUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, '')}${path}`;
}

export function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        abortController.abort();
    }, timeoutMs);

    try {
        return await fetch(url, {
            signal: abortController.signal,
        });
    } catch (error) {
        if (abortController.signal.aborted) {
            throw new Error(`Request timeout after ${timeoutMs}ms`, { cause: error });
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function waitForHttp({
    url,
    timeoutMs,
    requestTimeoutMs,
    pollIntervalMs,
    isReady,
}: {
    url: string;
    timeoutMs: number;
    requestTimeoutMs: number;
    pollIntervalMs: number;
    isReady: (response: Response) => boolean;
}): Promise<void> {
    const start = Date.now();
    let lastStatus: number | null = null;
    let lastError: string | null = null;
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        attempts += 1;

        try {
            const response = await fetchWithTimeout(url, requestTimeoutMs);
            lastStatus = response.status;

            if (isReady(response)) {
                return;
            }
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }

        if (attempts % 5 === 0) {
            const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
            const progressHint =
                lastStatus !== null
                    ? `last status=${lastStatus}`
                    : `last error=${lastError ?? 'unknown'}`;
            console.log(`Still waiting for ${url} (${elapsedSeconds}s elapsed, ${progressHint})`);
        }

        await sleep(pollIntervalMs);
    }

    const statusMessage =
        lastStatus !== null ? `last status=${lastStatus}` : `last error=${lastError ?? 'unknown'}`;
    throw new Error(`Timed out waiting for ${url} (${statusMessage})`);
}
