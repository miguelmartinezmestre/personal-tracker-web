'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@repo/ui/components/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { useTextSelection } from '@/hooks/use-text-selection';
import { buildLLMDeepLink, type LLMProvider } from '@/lib/llm-links';

const LLM_PROVIDERS: Array<{
    id: LLMProvider;
    name: string;
    color: string;
    hoverColor: string;
}> = [
    { id: 'chatgpt', name: 'ChatGPT', color: 'text-[#10a37f]', hoverColor: 'hover:bg-[#10a37f]/10' },
    { id: 'copilot', name: 'Copilot', color: 'text-[#0078d4]', hoverColor: 'hover:bg-[#0078d4]/10' },
    { id: 'claude', name: 'Claude', color: 'text-[#d97706]', hoverColor: 'hover:bg-[#d97706]/10' },
    { id: 'perplexity', name: 'Perplexity', color: 'text-[#20b2aa]', hoverColor: 'hover:bg-[#20b2aa]/10' },
];

function ChatGPTIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4086-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997z" />
        </svg>
    );
}

function CopilotIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
    );
}

function ClaudeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm5 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zM12 6c-2.21 0-4 1.79-4 4v1h8v-1c0-2.21-1.79-4-4-4z" />
        </svg>
    );
}

function PerplexityIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const ICON_COMPONENTS: Record<LLMProvider, React.ComponentType<{ className?: string }>> = {
    chatgpt: ChatGPTIcon,
    copilot: CopilotIcon,
    claude: ClaudeIcon,
    perplexity: PerplexityIcon,
};

export function TextSelectionToolbar() {
    const t = useTranslations('TextSelection');
    const { selectedText, position, isVisible, clearSelection } = useTextSelection();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleOpenInLLM = (provider: LLMProvider) => {
        const url = buildLLMDeepLink(provider, selectedText);
        window.open(url, '_blank', 'noopener,noreferrer');
        clearSelection();
        window.getSelection()?.removeAllRanges();
    };

    if (!mounted || !isVisible || !position) {
        return null;
    }

    const toolbar = (
        <div
            data-text-selection-toolbar
            className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-150"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <div className="bg-popover border rounded-lg shadow-lg p-1.5 flex gap-1">
                <TooltipProvider delayDuration={300}>
                    {LLM_PROVIDERS.map(provider => {
                        const IconComponent = ICON_COMPONENTS[provider.id];
                        return (
                            <Tooltip key={provider.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className={`${provider.color} ${provider.hoverColor}`}
                                        onClick={() => handleOpenInLLM(provider.id)}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('openIn', { provider: provider.name })}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    {t('openIn', { provider: provider.name })}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>
        </div>
    );

    return createPortal(toolbar, document.body);
}
