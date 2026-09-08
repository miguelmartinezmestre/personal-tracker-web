import {
    Smartphone,
    Tablet,
    Monitor,
    Tv,
    Watch,
    Cpu,
    type LucideIcon,
    Apple,
    Computer,
    Laptop,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations>;

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

function iconForOsMatch(
    osName: string | undefined,
    fallback: { icon: LucideIcon; deviceName: string }
): { icon: LucideIcon; deviceName: string } {
    if (!osName) {
        return fallback;
    }
    const desktopMatch = Object.entries(DESKTOP_OS_ICONS).find(([key]) => osName.includes(key));
    if (!desktopMatch) {
        return fallback;
    }
    return { icon: desktopMatch[1].icon, deviceName: fallback.deviceName };
}

function getMobileIconAndName(
    osName: string | undefined,
    modelOrVendor: string | undefined,
    t: Translate
): { icon: LucideIcon; deviceName: string } {
    if (osName?.includes('iOS')) {
        return { icon: Apple, deviceName: modelOrVendor || t('iphone') };
    }
    if (osName?.includes('Android')) {
        return { icon: Smartphone, deviceName: modelOrVendor || t('androidPhone') };
    }
    return { icon: Smartphone, deviceName: modelOrVendor || t('smartphone') };
}

function getTabletIconAndName(
    osName: string | undefined,
    modelOrVendor: string | undefined,
    t: Translate
): { icon: LucideIcon; deviceName: string } {
    if (osName?.includes('iOS')) {
        return { icon: Apple, deviceName: modelOrVendor || t('ipad') };
    }
    if (osName?.includes('Android')) {
        return { icon: Tablet, deviceName: modelOrVendor || t('androidTablet') };
    }
    return { icon: Tablet, deviceName: modelOrVendor || t('tablet') };
}

export function getDeviceIconAndName(
    deviceType: string,
    osName: string | undefined,
    deviceModel: string | undefined,
    deviceVendor: string | undefined,
    t: Translate
): { icon: LucideIcon; deviceName: string } {
    const modelOrVendor = deviceModel || deviceVendor;

    const simpleDevice = DEVICE_TYPE_ICONS[deviceType];
    if (simpleDevice) {
        return { icon: simpleDevice.icon, deviceName: modelOrVendor || t(simpleDevice.nameKey) };
    }

    if (deviceType === 'mobile') {
        return getMobileIconAndName(osName, modelOrVendor, t);
    }

    if (deviceType === 'tablet') {
        return getTabletIconAndName(osName, modelOrVendor, t);
    }

    if (osName) {
        const desktopMatch = Object.entries(DESKTOP_OS_ICONS).find(([key]) => osName.includes(key));
        if (desktopMatch) {
            return { icon: desktopMatch[1].icon, deviceName: t(desktopMatch[1].nameKey) };
        }
    }

    return iconForOsMatch(osName, { icon: Monitor, deviceName: modelOrVendor || t('device') });
}
