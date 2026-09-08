'use client';

type SkipToContentProps = {
    label: string;
    targetId: string;
};

export function SkipToContent({ label, targetId }: SkipToContentProps) {
    return (
        <button
            type="button"
            data-testid="skip-to-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-3 focus:text-foreground focus:outline-2"
            onClick={() => {
                document.getElementById(targetId)?.focus();
            }}
        >
            {label}
        </button>
    );
}
