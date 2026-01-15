'use client';

import { useCallback, useEffect, useState } from 'react';

interface SelectionPosition {
    x: number;
    y: number;
}

interface TextSelectionState {
    text: string;
    position: SelectionPosition | null;
    isVisible: boolean;
}

export function useTextSelection() {
    const [state, setState] = useState<TextSelectionState>({
        text: '',
        position: null,
        isVisible: false,
    });

    const clearSelection = useCallback(() => {
        setState({ text: '', position: null, isVisible: false });
    }, []);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            // Don't clear if clicking inside the text selection toolbar
            const target = e.target as HTMLElement;
            if (target.closest('[data-text-selection-toolbar]')) {
                return;
            }
            clearSelection();
        };

        const handleMouseUp = () => {
            // Small delay to ensure selection is complete
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection?.toString().trim() ?? '';

                if (selectedText.length === 0) {
                    clearSelection();
                    return;
                }

                const range = selection?.getRangeAt(0);
                if (!range) {
                    clearSelection();
                    return;
                }

                const rect = range.getBoundingClientRect();

                // Calculate position: center horizontally, above the selection
                const x = rect.left + rect.width / 2;
                const y = rect.top + window.scrollY - 8;

                setState({
                    text: selectedText,
                    position: { x, y },
                    isVisible: true,
                });
            }, 10);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Close on Escape
            if (e.key === 'Escape') {
                clearSelection();
                window.getSelection()?.removeAllRanges();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [clearSelection]);

    return {
        selectedText: state.text,
        position: state.position,
        isVisible: state.isVisible,
        clearSelection,
    };
}
