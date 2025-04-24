import { useEffect, useState } from 'react';
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
    ComputerIcon as Windows,
    LaptopIcon as Linux,
    SmartphoneIcon as Android,
} from 'lucide-react';
import { UAParser } from 'ua-parser-js';

interface DeviceInfo {
    icon: LucideIcon;
    deviceName: string;
    osName: string;
    browserName: string;
    fullDescription: string;
}

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
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        icon: Monitor,
        deviceName: 'Dispositivo desconocido',
        osName: 'Sistema operativo desconocido',
        browserName: 'Navegador desconocido',
        fullDescription: 'Dispositivo desconocido',
    });

    useEffect(() => {
        // Parse user agent using ua-parser-js
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        // Get device information
        const device = result.device;
        const os = result.os;
        const browser = result.browser;

        // Determine device type and icon
        let icon: LucideIcon = Monitor;
        let deviceName = device.model || device.vendor || 'Dispositivo';
        const deviceType = device.type || 'desktop';

        // Set icon based on device type
        switch (deviceType) {
            case 'mobile':
                icon = Smartphone;
                deviceName = device.model || device.vendor || 'Smartphone';
                break;
            case 'tablet':
                icon = Tablet;
                deviceName = device.model || device.vendor || 'Tablet';
                break;
            case 'smarttv':
                icon = Tv;
                deviceName = device.model || device.vendor || 'Smart TV';
                break;
            case 'wearable':
                icon = Watch;
                deviceName = device.model || device.vendor || 'Dispositivo wearable';
                break;
            case 'embedded':
                icon = Cpu;
                deviceName = device.model || device.vendor || 'Dispositivo embebido';
                break;
            case 'console':
                icon = Cpu;
                deviceName = device.model || device.vendor || 'Consola de juegos';
                break;
            default:
                // For desktop, use OS icon
                if (os.name) {
                    if (os.name.includes('Windows')) {
                        icon = Windows;
                        deviceName = 'PC Windows';
                    } else if (os.name.includes('Mac')) {
                        icon = Apple;
                        deviceName = 'Mac';
                    } else if (os.name.includes('Linux')) {
                        icon = Linux;
                        deviceName = 'PC Linux';
                    } else if (os.name.includes('Android')) {
                        icon = Android;
                        deviceName = 'Dispositivo Android';
                    } else if (os.name.includes('iOS')) {
                        icon = Apple;
                        deviceName = 'Dispositivo iOS';
                    }
                }
                break;
        }

        // Handle bots
        if (/bot|crawler|spider|crawling/i.test(navigator.userAgent.toLowerCase())) {
            icon = Bot;
            deviceName = 'Bot/Crawler';
        }

        // Get OS name with version
        const osName = os.name
            ? `${os.name}${os.version ? ' ' + os.version : ''}`
            : 'Sistema operativo desconocido';

        // Get browser name with version
        const browserName = browser.name
            ? `${browser.name}${browser.version ? ' ' + browser.version : ''}`
            : 'Navegador desconocido';

        // Create full description
        const fullDescription = `${deviceName} con ${osName} usando ${browserName}`;

        setDeviceInfo({
            icon,
            deviceName,
            osName,
            browserName,
            fullDescription,
        });
    }, [userAgent]);

    const Icon = deviceInfo.icon;

    return (
        <div className="flex items-center gap-2">
            <Icon size={size} className={className} />
            {showName && (
                <div>
                    {showFullInfo ? (
                        <div className="flex flex-col">
                            <span className="font-medium">{deviceInfo.deviceName}</span>
                            <span className="text-sm text-muted-foreground">
                                {deviceInfo.osName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {deviceInfo.browserName}
                            </span>
                        </div>
                    ) : (
                        <span>{deviceInfo.deviceName}</span>
                    )}
                </div>
            )}
        </div>
    );
}
