'use client';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
                Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
                {error.message || 'An unexpected error occurred.'}
            </p>
            <button
                onClick={reset}
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
