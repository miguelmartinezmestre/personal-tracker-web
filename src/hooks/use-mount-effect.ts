'use client';

import { useEffect } from 'react';

type MountCleanup = () => void;

export function useMountEffect(effect: () => MountCleanup | undefined) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effect, []);
}
