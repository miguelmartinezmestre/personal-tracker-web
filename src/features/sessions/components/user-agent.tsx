'use client';

import { Bot } from 'lucide-react';
import { UAParser } from 'ua-parser-js';
import { useTranslations } from 'next-intl';
import { getDeviceIconAndName } from './device-icon';

interface UserAgentIconProps {
    size?: number;
    className?: string;
    showName?: boolean;
    showFullInfo?: boolean;
    userAgent: string;
}

export function UserAgentIcon({
    size = 24,
    className,
    showName = true,
    showFullInfo = true,
    userAgent,
}: UserAgentIconProps) {
    const t = useTranslations('UserAgent');

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const { device, os, browser } = result;
    const deviceType = device.type || 'desktop';

    let { icon, deviceName } = getDeviceIconAndName(
        deviceType,
        os.name,
        device.model,
        device.vendor,
        t
    );

    if (/bot|crawler|spider|crawling/i.test(userAgent)) {
        icon = Bot;
        deviceName = t('botCrawler');
    }

    const osName = os.name ? `${os.name}${os.version ? ' ' + os.version : ''}` : t('unknownOs');
    const browserName = browser.name
        ? `${browser.name}${browser.version ? ' ' + browser.version : ''}`
        : t('unknownBrowser');
    const IconComponent = icon;

    return (
        <div className="flex items-center gap-2">
            <IconComponent size={size} className={className} aria-label={deviceName} />
            {showName && (
                <div>
                    {showFullInfo ? (
                        <div className="flex flex-col">
                            <span className="font-medium">{deviceName}</span>
                            <span className="text-sm text-muted-foreground">{osName}</span>
                            <span className="text-sm text-muted-foreground">{browserName}</span>
                        </div>
                    ) : (
                        <span>{deviceName}</span>
                    )}
                </div>
            )}
        </div>
    );
}
