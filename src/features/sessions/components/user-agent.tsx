'use client';

import {
    Smartphone,
    Tablet,
    Monitor,
    Tv,
    Watch,
    Bot,
    Cpu,
    type LucideIcon,
    Apple,
    Computer,
    Laptop,
} from 'lucide-react';
import { UAParser } from 'ua-parser-js';
import { useTranslations } from 'next-intl';

interface UserAgentIconProps {
    size?: number;
    className?: string;
    showName?: boolean;
    showFullInfo?: boolean;
    userAgent: string;
}

const DEVICE_TYPE_ICONS: Record<string, { icon: LucideIcon; nameKey: string }> = {
    smarttv: { icon: Tv, nameKey: 'smartTv' },
    wearable: { icon: Watch, nameKey: 'wearable' },
    embedded: { icon: Cpu, nameKey: 'embedded' },
    console: { icon: Cpu, nameKey: 'gameConsole' },
};

const DESKTOP_OS_ICONS: Record<string, { icon: LucideIcon; nameKey: string }> = {
    Windows: { icon: Computer, nameKey: 'windowsPc' },
    'Mac OS': { icon: Apple, nameKey: 'mac' },
    macOS: { icon: Apple, nameKey: 'mac' },
    Linux: { icon: Laptop, nameKey: 'linuxPc' },
    'Chrome OS': { icon: Laptop, nameKey: 'chromebook' },
    Android: { icon: Smartphone, nameKey: 'androidDevice' },
};

function getDeviceIconAndName(
    deviceType: string,
    osName: string | undefined,
    deviceModel: string | undefined,
    deviceVendor: string | undefined,
    t: ReturnType<typeof useTranslations>
): { icon: LucideIcon; deviceName: string } {
    const modelOrVendor = deviceModel || deviceVendor;

    const simpleDevice = DEVICE_TYPE_ICONS[deviceType];
    if (simpleDevice) {
        return { icon: simpleDevice.icon, deviceName: modelOrVendor || t(simpleDevice.nameKey) };
    }

    if (deviceType === 'mobile') {
        if (osName?.includes('iOS')) {
            return { icon: Apple, deviceName: modelOrVendor || t('iphone') };
        }
        if (osName?.includes('Android')) {
            return { icon: Smartphone, deviceName: modelOrVendor || t('androidPhone') };
        }
        return { icon: Smartphone, deviceName: modelOrVendor || t('smartphone') };
    }

    if (deviceType === 'tablet') {
        if (osName?.includes('iOS')) {
            return { icon: Apple, deviceName: modelOrVendor || t('ipad') };
        }
        if (osName?.includes('Android')) {
            return { icon: Tablet, deviceName: modelOrVendor || t('androidTablet') };
        }
        return { icon: Tablet, deviceName: modelOrVendor || t('tablet') };
    }

    if (osName) {
        const desktopMatch = Object.entries(DESKTOP_OS_ICONS).find(([key]) => osName.includes(key));
        if (desktopMatch) {
            return { icon: desktopMatch[1].icon, deviceName: t(desktopMatch[1].nameKey) };
        }
    }

    return { icon: Monitor, deviceName: modelOrVendor || t('device') };
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
