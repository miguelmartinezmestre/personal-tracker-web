'use client';

import { useEffect, useState } from 'react';

const REFERENCE_TIME_REFRESH_MS = 60_000;

export function useReferenceNow(): number {
    const [referenceNow, setReferenceNow] = useState(() => Date.now());

    useEffect(() => {
        const refreshReferenceTime = () => setReferenceNow(Date.now());
        const intervalId = window.setInterval(refreshReferenceTime, REFERENCE_TIME_REFRESH_MS);
        let midnightId: number;
        const scheduleMidnight = () => {
            const now = Date.now();
            const nextMidnight = Math.floor(now / 86_400_000) * 86_400_000 + 86_400_000;
            midnightId = window.setTimeout(() => {
                refreshReferenceTime();
                scheduleMidnight();
            }, nextMidnight - now);
        };
        scheduleMidnight();

        document.addEventListener('visibilitychange', refreshReferenceTime);
        window.addEventListener('focus', refreshReferenceTime);

        return () => {
            window.clearInterval(intervalId);
            window.clearTimeout(midnightId);
            document.removeEventListener('visibilitychange', refreshReferenceTime);
            window.removeEventListener('focus', refreshReferenceTime);
        };
    }, []);

    return referenceNow;
}
