'use client';

import { useEffect, useState } from 'react';

const REFERENCE_TIME_REFRESH_MS = 60_000;

export function useReferenceNow(): number {
    const [referenceNow, setReferenceNow] = useState(() => Date.now());

    useEffect(() => {
        const refreshReferenceTime = () => setReferenceNow(Date.now());
        const intervalId = window.setInterval(refreshReferenceTime, REFERENCE_TIME_REFRESH_MS);

        document.addEventListener('visibilitychange', refreshReferenceTime);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', refreshReferenceTime);
        };
    }, []);

    return referenceNow;
}
