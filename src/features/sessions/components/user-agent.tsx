'use client';

import { Bot, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UserAgentIconProps {
    size?: number;
    className?: string;
    showName?: boolean;
    userAgent: string;
}

function detectDeviceKind(userAgent: string): 'bot' | 'mobile' | 'tablet' | 'desktop' {
    if (/bot|crawler|spider|crawling/i.test(userAgent)) {
        return 'bot';
    }
    if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
        return 'tablet';
    }
    if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) {
        return 'mobile';
    }
    return 'desktop';
}

const DEVICE_PRESENTATION = {
    bot: { icon: Bot, labelKey: 'botCrawler' },
    mobile: { icon: Smartphone, labelKey: 'smartphone' },
    tablet: { icon: Tablet, labelKey: 'tablet' },
    desktop: { icon: Monitor, labelKey: 'device' },
} as const;

export function UserAgentIcon({
    size = 24,
    className,
    showName = true,
    userAgent,
}: UserAgentIconProps) {
    const t = useTranslations('UserAgent');
    const { icon: IconComponent, labelKey } = DEVICE_PRESENTATION[detectDeviceKind(userAgent)];
    const deviceName = t(labelKey);

    return (
        <div className="flex min-w-0 items-center gap-2">
            <IconComponent size={size} className={className} aria-label={deviceName} />
            {showName && (
                <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{deviceName}</span>
                    <span
                        className="max-w-64 truncate text-sm text-muted-foreground"
                        title={userAgent}
                    >
                        {userAgent}
                    </span>
                </div>
            )}
        </div>
    );
}
