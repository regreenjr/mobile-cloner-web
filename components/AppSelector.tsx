"use client"

import * as React from "react"
import { Check, ChevronDown, X, Loader2, Smartphone, AlertCircle } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReferenceAppRow } from "@/types/database"
import { referenceApps } from "@/lib/supabase/db"

// ============================================================================
// Types
// ============================================================================

/**
 * Simplified app info for display purposes
 */
export interface SelectedApp {
  id: string
  name: string
  category: string
  iconUrl?: string
  screenshotCount: number
}

/**
 * Props for the AppSelector component
 */
export interface AppSelectorProps {
  /** Currently selected app IDs */
  selectedAppIds: string[]
  /** Callback when selection changes */
  onSelectionChange: (appIds: string[]) => void
  /** Minimum number of apps that must be selected (default: 2) */
  minSelection?: number
  /** Maximum number of apps that can be selected (default: 4) */
  maxSelection?: number
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
  /** Placeholder text when no apps are selected */
  placeholder?: string
  /** Pre-loaded apps (if not provided, component will fetch from database) */
  apps?: ReferenceAppRow[]
  /** Error message to display */
  error?: string | null
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Skeleton loader for the app list
 */
function AppListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-md">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no analyzed apps are found
 */
function EmptyState() {
  return (
    <div className="p-6 text-center">
      <Smartphone className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-sm font-medium text-muted-foreground mb-1">
        No analyzed apps found
      </p>
      <p className="text-xs text-muted-foreground/70">
        Analyze some apps first to compare them
      </p>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-6 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/50 mx-auto mb-3" />
      <p className="text-sm font-medium text-destructive mb-1">
        Failed to load apps
      </p>
      <p className="text-xs text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * Single app item in the dropdown list
 */
interface AppItemProps {
  app: ReferenceAppRow
  isSelected: boolean
  isDisabled: boolean
  onToggle: () => void
}

function AppItem({ app, isSelected, isDisabled, onToggle }: AppItemProps) {
  // Get first screenshot URL as icon
  const iconUrl = app.screenshots?.[0]?.url

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={cn(
        "flex items-center gap-3 w-full p-2 rounded-md text-left transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        isSelected && "bg-accent/50",
        isDisabled && !isSelected && "opacity-50 cursor-not-allowed"
      )}
      role="option"
      aria-selected={isSelected}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "flex items-center justify-center h-5 w-5 rounded border shrink-0 transition-colors",
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>

      {/* App Icon */}
      <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-muted">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={`${app.name} icon`}
            fill
            className="object-cover"
            sizes="40px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-sm">{app.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {app.category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {app.screenshots?.length ?? 0} screenshots
          {app.analysis && " • Analyzed"}
        </p>
      </div>
    </button>
  )
}

/**
 * Selected app chip displayed in the trigger
 */
interface SelectedAppChipProps {
  app: ReferenceAppRow
  onRemove: () => void
  disabled?: boolean
}

function SelectedAppChip({ app, onRemove, disabled }: SelectedAppChipProps) {
  const iconUrl = app.screenshots?.[0]?.url

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-secondary rounded-md pl-1 pr-0.5 py-0.5",
        "text-sm text-secondary-foreground"
      )}
    >
      {/* Mini icon */}
      <div className="relative h-5 w-5 shrink-0 rounded overflow-hidden bg-muted">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={`${app.name} icon`}
            fill
            className="object-cover"
            sizes="20px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Smartphone className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>

      <span className="truncate max-w-[100px]">{app.name}</span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        disabled={disabled}
        className={cn(
          "ml-0.5 p-0.5 rounded hover:bg-secondary-foreground/10 transition-colors",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={`Remove ${app.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AppSelector - Multi-select dropdown for selecting analyzed apps
 *
 * Features:
 * - Fetches analyzed apps from database (or uses provided apps)
 * - Multi-select with configurable min/max selection (2-4 by default)
 * - Shows app icons, names, and categories
 * - Click outside to close dropdown
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <AppSelector
 *   selectedAppIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   minSelection={2}
 *   maxSelection={4}
 *   placeholder="Select apps to compare..."
 * />
 * ```
 */
export function AppSelector({
  selectedAppIds,
  onSelectionChange,
  minSelection = 2,
  maxSelection = 4,
  disabled = false,
  className,
  placeholder = "Select apps to compare...",
  apps: providedApps,
  error: externalError,
}: AppSelectorProps) {
  // State
  const [isOpen, setIsOpen] = React.useState(false)
  const [apps, setApps] = React.useState<ReferenceAppRow[]>(providedApps ?? [])
  const [isLoading, setIsLoading] = React.useState(!providedApps)
  const [error, setError] = React.useState<string | null>(externalError ?? null)

  // Refs
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Fetch apps on mount if not provided
  React.useEffect(() => {
    if (providedApps) {
      setApps(providedApps)
      setIsLoading(false)
      return
    }

    let mounted = true

    async function fetchApps() {
      setIsLoading(true)
      setError(null)

      const result = await referenceApps.getAnalyzed()

      if (!mounted) return

      if (result.success) {
        setApps(result.data)
      } else {
        setError((result as any).error.userMessage)
      }

      setIsLoading(false)
    }

    fetchApps()

    return () => {
      mounted = false
    }
  }, [providedApps])

  // Update error state when external error changes
  React.useEffect(() => {
    if (externalError !== undefined) {
      setError(externalError)
    }
  }, [externalError])

  // Click outside handler
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Keyboard handler
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    },
    []
  )

  // Get selected apps data
  const selectedApps = React.useMemo(() => {
    return apps.filter((app) => selectedAppIds.includes(app.id))
  }, [apps, selectedAppIds])

  // Check if at max selection
  const atMaxSelection = selectedAppIds.length >= maxSelection

  // Toggle app selection
  const toggleApp = React.useCallback(
    (appId: string) => {
      const isSelected = selectedAppIds.includes(appId)

      if (isSelected) {
        onSelectionChange(selectedAppIds.filter((id) => id !== appId))
      } else if (!atMaxSelection) {
        onSelectionChange([...selectedAppIds, appId])
      }
    },
    [selectedAppIds, onSelectionChange, atMaxSelection]
  )

  // Remove app from selection
  const removeApp = React.useCallback(
    (appId: string) => {
      onSelectionChange(selectedAppIds.filter((id) => id !== appId))
    },
    [selectedAppIds, onSelectionChange]
  )

  // Retry loading apps
  const handleRetry = React.useCallback(() => {
    if (providedApps) return

    setIsLoading(true)
    setError(null)

    referenceApps.getAnalyzed().then((result) => {
      if (result.success) {
        setApps(result.data)
      } else {
        setError((result as any).error.userMessage)
      }
      setIsLoading(false)
    })
  }, [providedApps])

  // Determine selection status text
  const getSelectionStatus = () => {
    const count = selectedAppIds.length
    if (count === 0) return null
    if (count < minSelection) {
      return `Select ${minSelection - count} more app${minSelection - count > 1 ? "s" : ""}`
    }
    if (count === maxSelection) {
      return "Maximum apps selected"
    }
    return `${count} of ${maxSelection} apps selected`
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between w-full min-h-[44px] px-3 py-2",
          "border rounded-lg bg-background text-left transition-colors",
          "hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select apps to compare"
      >
        <div className="flex-1 min-w-0">
          {selectedApps.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedApps.map((app) => (
                <SelectedAppChip
                  key={app.id}
                  app={app}
                  onRemove={() => removeApp(app.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 ml-2 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Selection status */}
      {getSelectionStatus() && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            selectedAppIds.length < minSelection
              ? "text-yellow-600 dark:text-yellow-500"
              : "text-muted-foreground"
          )}
        >
          {getSelectionStatus()}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 z-50 mt-1",
            "bg-popover border rounded-lg shadow-lg",
            "max-h-[320px] overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95 duration-100"
          )}
          role="listbox"
          aria-label="Available apps"
          aria-multiselectable="true"
          onKeyDown={handleKeyDown}
        >
          {/* Loading state */}
          {isLoading && <AppListSkeleton />}

          {/* Error state */}
          {!isLoading && error && (
            <ErrorState message={error} onRetry={handleRetry} />
          )}

          {/* Empty state */}
          {!isLoading && !error && apps.length === 0 && <EmptyState />}

          {/* App list */}
          {!isLoading && !error && apps.length > 0 && (
            <div className="p-2 space-y-0.5">
              {/* Header with count info */}
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-2">
                {apps.length} analyzed app{apps.length !== 1 ? "s" : ""} available
                {atMaxSelection && (
                  <span className="ml-2 text-yellow-600 dark:text-yellow-500">
                    (max {maxSelection} selected)
                  </span>
                )}
              </div>

              {apps.map((app) => {
                const isSelected = selectedAppIds.includes(app.id)
                const isDisabled = atMaxSelection && !isSelected

                return (
                  <AppItem
                    key={app.id}
                    app={app}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    onToggle={() => toggleApp(app.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Hook for consuming selected apps data
// ============================================================================

/**
 * Custom hook to get full app data for selected IDs
 *
 * @param selectedIds - Array of selected app IDs
 * @param apps - Optional pre-loaded apps array
 * @returns Object with selected apps data and loading state
 *
 * @example
 * ```tsx
 * const { selectedApps, isLoading } = useSelectedApps(selectedIds)
 * ```
 */
export function useSelectedApps(
  selectedIds: string[],
  apps?: ReferenceAppRow[]
): {
  selectedApps: ReferenceAppRow[]
  isLoading: boolean
  error: string | null
} {
  const [loadedApps, setLoadedApps] = React.useState<ReferenceAppRow[]>(apps ?? [])
  const [isLoading, setIsLoading] = React.useState(!apps)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch apps if not provided
  React.useEffect(() => {
    if (apps) {
      setLoadedApps(apps)
      setIsLoading(false)
      return
    }

    let mounted = true

    async function fetchApps() {
      setIsLoading(true)
      const result = await referenceApps.getAnalyzed()

      if (!mounted) return

      if (result.success) {
        setLoadedApps(result.data)
      } else {
        setError((result as any).error.userMessage)
      }
      setIsLoading(false)
    }

    fetchApps()

    return () => {
      mounted = false
    }
  }, [apps])

  // Filter to selected apps
  const selectedApps = React.useMemo(() => {
    return loadedApps.filter((app) => selectedIds.includes(app.id))
  }, [loadedApps, selectedIds])

  return { selectedApps, isLoading, error }
}

// ============================================================================
// Exports
// ============================================================================

export { AppItem, SelectedAppChip, AppListSkeleton, EmptyState, ErrorState }
export type { AppItemProps, SelectedAppChipProps }
