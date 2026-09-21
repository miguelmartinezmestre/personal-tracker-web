export {};

declare global {
    interface ImportMeta {
        glob: (
            pattern: string | readonly string[],
            options?: { eager?: boolean }
        ) => Record<string, () => Promise<unknown>>;
    }
}
