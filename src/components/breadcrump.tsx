"use client"

import type React from "react"

import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"
import { useSelectedLayoutSegments } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils"

export function BreadcrumbNav({
  className,
  homeLabel = "Inicio",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  homeLabel?: string
}) {
  const pathname = usePathname()
  const segments = useSelectedLayoutSegments() // Get route segments [^1]

  // Don't render breadcrumbs on home page
  if (pathname === "/dashboard/home") {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      {...props}
    >
      <ol className="flex items-center space-x-1">
        <li>
          <Link href={{ pathname: '/dashboard/home' }} className="flex items-center hover:text-foreground" aria-label={homeLabel} prefetch={false}>
            <Home className="h-4 w-4" />
          </Link>
        </li>
        <li>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </li>

        {segments.map((segment, index) => {
          // Skip route groups (segments that start with parentheses)
          if (segment.startsWith("(")) {
            return null
          }

          // Build up the path for this segment
          const segmentPath = `/${segments.slice(0, index + 1).join("/")}`

          // Format the segment for display (replace hyphens with spaces, capitalize)
          const displayName = segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

          const isLast = index === segments.filter((s) => !s.startsWith("(")).length - 1

          return (
            <li key={segment} className="flex items-center">
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {displayName}
                </span>
              ) : (
                <>
                  <Link href={segmentPath as Route} className="hover:text-foreground">
                    {displayName}
                  </Link>
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
