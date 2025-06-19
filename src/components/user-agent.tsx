"use client"

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
} from "lucide-react"
import { UAParser } from "ua-parser-js"

interface DeviceInfo {
  icon: LucideIcon
  deviceName: string
  osName: string
  browserName: string
  fullDescription: string
}

interface UserAgentIconProps {
  size?: number
  className?: string
  showName?: boolean
  showFullInfo?: boolean
  userAgent: string
}

export function UserAgentIcon({
  size = 24,
  className,
  showName = true,
  showFullInfo = true,
  userAgent,
}: UserAgentIconProps) {
  // Parse user agent using ua-parser-js directly in the render body
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const device = result.device
  const os = result.os
  const browser = result.browser

  // Determine device type and icon
  let icon: LucideIcon = Monitor // Default icon
  let deviceName = device.model || device.vendor || "Dispositivo" // Default device name
  const deviceType = device.type || "desktop" // Default to desktop if type is unknown

  // Set icon and deviceName based on device type and OS
  switch (deviceType) {
    case "mobile":
      if (os.name?.includes("iOS")) {
        icon = Apple
        deviceName = device.model || device.vendor || "iPhone"
      } else if (os.name?.includes("Android")) {
        icon = Smartphone // Specific Android icon could be used if available/desired
        deviceName = device.model || device.vendor || "Android Phone"
      } else {
        icon = Smartphone
        deviceName = device.model || device.vendor || "Smartphone"
      }
      break
    case "tablet":
      if (os.name?.includes("iOS")) {
        // iPadOS is reported as iOS by UAParser
        icon = Apple
        deviceName = device.model || device.vendor || "iPad"
      } else if (os.name?.includes("Android")) {
        icon = Tablet
        deviceName = device.model || device.vendor || "Android Tablet"
      } else {
        icon = Tablet
        deviceName = device.model || device.vendor || "Tablet"
      }
      break
    case "smarttv":
      icon = Tv
      deviceName = device.model || device.vendor || "Smart TV"
      break
    case "wearable":
      icon = Watch
      deviceName = device.model || device.vendor || "Dispositivo wearable"
      break
    case "embedded":
      icon = Cpu
      deviceName = device.model || device.vendor || "Dispositivo embebido"
      break
    case "console":
      icon = Cpu // Consider Gamepad icon if available and more appropriate
      deviceName = device.model || device.vendor || "Consola de juegos"
      break
    default: // 'desktop' or unknown type
      if (os.name) {
        if (os.name.includes("Windows")) {
          icon = Computer
          deviceName = "Windows PC"
        } else if (os.name.includes("Mac OS")) {
          // UAParser uses "Mac OS" for macOS
          icon = Apple
          deviceName = "Mac"
        } else if (os.name.includes("Linux")) {
          icon = Laptop // Or Computer if it's a desktop Linux
          deviceName = "Linux PC"
        } else if (os.name.includes("Chrome OS")) {
          icon = Laptop
          deviceName = "Chromebook"
        } else if (os.name.includes("Android")) {
          // This could be an Android-based desktop or AIO
          icon = Smartphone // Or a more generic Android icon
          deviceName = "Dispositivo Android"
        } else if (os.name.includes("iOS")) {
          // Less common for default/desktop type, but possible
          icon = Apple
          deviceName = "Dispositivo iOS"
        }
        // If no OS match, icon remains Monitor and deviceName its default
      }
      break
  }

  // Handle bots, checking the provided userAgent prop
  if (/bot|crawler|spider|crawling/i.test(userAgent.toLowerCase())) {
    icon = Bot
    deviceName = "Bot/Crawler"
  }

  // Get OS name with version
  const osName = os.name ? `${os.name}${os.version ? " " + os.version : ""}` : "Sistema operativo desconocido"

  // Get browser name with version
  const browserName = browser.name
    ? `${browser.name}${browser.version ? " " + browser.version : ""}`
    : "Navegador desconocido"

  // Create full description
  const fullDescription = `${deviceName} con ${osName} usando ${browserName}`

  // The deviceInfo is now derived on every render
  const derivedDeviceInfo: DeviceInfo = {
    icon,
    deviceName,
    osName,
    browserName,
    fullDescription,
  }

  const IconComponent = derivedDeviceInfo.icon // Use a different name for the component

  return (
    <div className="flex items-center gap-2">
      <IconComponent size={size} className={className} aria-label={derivedDeviceInfo.deviceName} />
      {showName && (
        <div>
          {showFullInfo ? (
            <div className="flex flex-col">
              <span className="font-medium">{derivedDeviceInfo.deviceName}</span>
              <span className="text-sm text-muted-foreground">{derivedDeviceInfo.osName}</span>
              <span className="text-sm text-muted-foreground">{derivedDeviceInfo.browserName}</span>
            </div>
          ) : (
            <span>{derivedDeviceInfo.deviceName}</span>
          )}
        </div>
      )}
    </div>
  )
}
