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

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            abortController.abort();
            reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([
            fetch(url, {
                signal: abortController.signal,
            }),
            timeoutPromise,
        ]);
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
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
