export {};

declare global {
    interface ImportMeta {
        glob: (
            pattern: string,
            options?: { eager?: boolean }
        ) => Record<string, () => Promise<unknown>>;
    }
}
