'use client';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Keep server-rendered controls disabled until their client handlers can retain input. */
export function useHydrated() {
    return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
