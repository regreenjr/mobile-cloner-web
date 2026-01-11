"use client"

import * as React from "react"
import { Search, X, Loader2, Apple, Smartphone, AlertCircle, RefreshCw, WifiOff, Clock } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { AppSearchResult, AppStorePlatform, AppStoreErrorCode } from "@/types/appStore"

// ============================================================================
// Types
// ============================================================================

/** Platform filter options for search */
export type PlatformFilter = 'ios' | 'android' | 'both'

/** Error type for categorizing errors */
export type SearchErrorType = 'network' | 'rate_limit' | 'timeout' | 'server' | 'unknown'

/** Structured error info for better UI handling */
export interface SearchErrorInfo {
  type: SearchErrorType
  message: string
  code?: AppStoreErrorCode
  retryable: boolean
  retryAfterMs?: number
}

export interface AppSearchInputProps {
  /** Callback when search query changes (debounced) */
  onSearch?: (query: string) => void
  /** Callback when an app is selected from results */
  onAppSelect?: (app: AppSearchResult) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number
  /** Minimum characters required to trigger search (default: 2) */
  minChars?: number
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
  /** Initial search query value */
  defaultValue?: string
  /** Controlled value for the search query */
  value?: string
  /** Callback when the input value changes (not debounced) */
  onChange?: (value: string) => void
  /** Whether a search is currently in progress (for loading indicator) */
  isLoading?: boolean
  /** Auto focus the input on mount */
  autoFocus?: boolean
  /** Search results to display in dropdown */
  results?: AppSearchResult[]
  /** Whether the dropdown should be shown */
  showDropdown?: boolean
  /** Message to show when no results are found */
  noResultsMessage?: string
  /** Error message to display */
  error?: string | null
  /** Current platform filter */
  platformFilter?: PlatformFilter
  /** Callback when platform filter changes */
  onPlatformChange?: (platform: PlatformFilter) => void
  /** Whether to show the platform toggle */
  showPlatformToggle?: boolean
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Custom hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timer if the value changes before the delay has passed
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Platform icon component
 */
function PlatformIcon({ platform, className }: { platform: AppStorePlatform; className?: string }) {
  if (platform === 'ios') {
    return <Apple className={cn("h-3 w-3", className)} />
  }
  return <Smartphone className={cn("h-3 w-3", className)} />
}

/**
 * Platform badge component with appropriate styling
 */
function PlatformBadge({ platform }: { platform: AppStorePlatform }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 text-[10px] px-1.5 py-0",
        platform === 'ios'
          ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      )}
    >
      <PlatformIcon platform={platform} className="h-2.5 w-2.5" />
      {platform === 'ios' ? 'iOS' : 'Android'}
    </Badge>
  )
}

/**
 * App card skeleton for loading state
 */
function AppCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/**
 * Single app card in the search results dropdown
 */
interface AppCardProps {
  app: AppSearchResult
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
}

function AppCard({ app, isSelected, onClick, onMouseEnter }: AppCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex items-center gap-3 w-full p-3 text-left transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        isSelected && "bg-accent"
      )}
      role="option"
      aria-selected={isSelected}
    >
      {/* App Icon */}
      <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-muted">
        {app.iconUrl ? (
          <Image
            src={app.iconUrl}
            alt={`${app.name} icon`}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized // External URLs from app stores
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Smartphone className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate text-sm">{app.name}</span>
          <PlatformBadge platform={app.platform} />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {app.developer}
        </p>
        {app.category && (
          <p className="text-xs text-muted-foreground/70 truncate">
            {app.category}
          </p>
        )}
      </div>

      {/* Rating (if available) */}
      {app.rating !== undefined && app.rating > 0 && (
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <span className="text-yellow-500">★</span>
            <span>{app.rating.toFixed(1)}</span>
          </div>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// Platform Toggle Component
// ============================================================================

interface PlatformToggleProps {
  /** Currently selected platform filter */
  value: PlatformFilter
  /** Callback when platform filter changes */
  onChange: (platform: PlatformFilter) => void
  /** Whether the toggle is disabled */
  disabled?: boolean
  /** Size variant */
  size?: 'sm' | 'default'
  /** Additional class names */
  className?: string
}

/**
 * Platform toggle component for filtering search by iOS, Android, or Both
 */
function PlatformToggle({
  value,
  onChange,
  disabled = false,
  size = 'default',
  className,
}: PlatformToggleProps) {
  const options: { value: PlatformFilter; label: string; icon: React.ReactNode }[] = [
    {
      value: 'ios',
      label: 'iOS',
      icon: <Apple className={size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5"} />,
    },
    {
      value: 'android',
      label: 'Android',
      icon: <Smartphone className={size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5"} />,
    },
    {
      value: 'both',
      label: 'Both',
      icon: null,
    },
  ]

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-muted p-0.5",
        size === 'sm' ? "h-7" : "h-8",
        className
      )}
      role="radiogroup"
      aria-label="Platform filter"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-md font-medium transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
            size === 'sm' ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Search results dropdown component
 */
interface SearchResultsDropdownProps {
  results: AppSearchResult[]
  isLoading: boolean
  isOpen: boolean
  selectedIndex: number
  onSelect: (app: AppSearchResult) => void
  onHover: (index: number) => void
  noResultsMessage: string
  error?: string | null
  hasSearched: boolean
}

function SearchResultsDropdown({
  results,
  isLoading,
  isOpen,
  selectedIndex,
  onSelect,
  onHover,
  noResultsMessage,
  error,
  hasSearched,
}: SearchResultsDropdownProps) {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1",
        "bg-popover border rounded-lg shadow-lg",
        "max-h-[400px] overflow-y-auto",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      role="listbox"
      aria-label="Search results"
    >
      {/* Error state */}
      {error && (
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="divide-y divide-border">
          <AppCardSkeleton />
          <AppCardSkeleton />
          <AppCardSkeleton />
        </div>
      )}

      {/* No results state */}
      {!isLoading && !error && hasSearched && results.length === 0 && (
        <div className="p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
        </div>
      )}

      {/* Results list */}
      {!isLoading && !error && results.length > 0 && (
        <div className="divide-y divide-border">
          {results.map((app, index) => (
            <AppCard
              key={`${app.platform}-${app.id}`}
              app={app}
              isSelected={index === selectedIndex}
              onClick={() => onSelect(app)}
              onMouseEnter={() => onHover(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Error State Components
// ============================================================================

/**
 * Props for the error state display component
 */
interface ErrorStateDisplayProps {
  error: SearchErrorInfo
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

/**
 * Get icon for error type
 */
function getErrorIcon(type: SearchErrorType): React.ReactNode {
  switch (type) {
    case 'network':
      return <WifiOff className="h-4 w-4" />
    case 'rate_limit':
      return <Clock className="h-4 w-4" />
    case 'timeout':
      return <Clock className="h-4 w-4" />
    case 'server':
    case 'unknown':
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

/**
 * Get user-friendly title for error type
 */
function getErrorTitle(type: SearchErrorType): string {
  switch (type) {
    case 'network':
      return 'Connection Error'
    case 'rate_limit':
      return 'Too Many Requests'
    case 'timeout':
      return 'Request Timed Out'
    case 'server':
      return 'Server Error'
    case 'unknown':
    default:
      return 'Search Error'
  }
}

/**
 * Custom hook for countdown timer (used for rate limit retry)
 */
function useCountdown(initialMs: number, onComplete?: () => void): {
  remainingSeconds: number
  isActive: boolean
  start: () => void
  reset: () => void
} {
  const [remainingMs, setRemainingMs] = React.useState(initialMs)
  const [isActive, setIsActive] = React.useState(false)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const remainingSeconds = Math.ceil(remainingMs / 1000)

  const clearTimer = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = React.useCallback(() => {
    setIsActive(true)
    setRemainingMs(initialMs)
    clearTimer()

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 100) {
          clearTimer()
          setIsActive(false)
          onComplete?.()
          return 0
        }
        return prev - 100
      })
    }, 100)
  }, [initialMs, onComplete, clearTimer])

  const reset = React.useCallback(() => {
    clearTimer()
    setRemainingMs(initialMs)
    setIsActive(false)
  }, [initialMs, clearTimer])

  React.useEffect(() => {
    return clearTimer
  }, [clearTimer])

  return { remainingSeconds, isActive, start, reset }
}

/**
 * ErrorStateDisplay - Displays error states with appropriate styling and retry options
 */
function ErrorStateDisplay({
  error,
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateDisplayProps) {
  const { remainingSeconds, isActive, start } = useCountdown(
    error.retryAfterMs || 0,
    onRetry
  )

  // Auto-start countdown for rate limit errors with retryAfterMs
  React.useEffect(() => {
    if (error.type === 'rate_limit' && error.retryAfterMs && error.retryAfterMs > 0) {
      start()
    }
  }, [error.type, error.retryAfterMs, start])

  const showRetryButton = error.retryable && onRetry && !isActive
  const showCountdown = error.type === 'rate_limit' && isActive && remainingSeconds > 0

  return (
    <Alert
      variant="destructive"
      className={cn("animate-in fade-in-0 slide-in-from-top-1 duration-200", className)}
    >
      {getErrorIcon(error.type)}
      <div className="flex-1">
        <div className="font-medium text-sm">{getErrorTitle(error.type)}</div>
        <AlertDescription className="mt-1">
          {error.message}
        </AlertDescription>

        {/* Retry actions */}
        <div className="mt-3 flex items-center gap-2">
          {showRetryButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="h-7 text-xs bg-background hover:bg-accent"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </>
              )}
            </Button>
          )}

          {showCountdown && (
            <span className="text-xs text-muted-foreground">
              Retrying automatically in {remainingSeconds}s...
            </span>
          )}
        </div>
      </div>
    </Alert>
  )
}

/**
 * Inline error display for dropdown context
 */
interface InlineErrorDisplayProps {
  message: string
  type?: SearchErrorType
  onRetry?: () => void
  isRetrying?: boolean
}

function InlineErrorDisplay({
  message,
  type = 'unknown',
  onRetry,
  isRetrying = false,
}: InlineErrorDisplayProps) {
  return (
    <div className="p-4 text-center space-y-3">
      <div className="flex items-center justify-center gap-2 text-destructive">
        {getErrorIcon(type)}
        <span className="text-sm font-medium">{getErrorTitle(type)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="h-7 text-xs"
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Try Again
            </>
          )}
        </Button>
      )}
    </div>
  )
}

/**
 * Partial failure warning badge - shown when one platform succeeds but another fails
 */
interface PartialFailureWarningProps {
  iosError?: string | null
  androidError?: string | null
  platformFilter: PlatformFilter
  className?: string
}

function PartialFailureWarning({
  iosError,
  androidError,
  platformFilter,
  className,
}: PartialFailureWarningProps) {
  const warnings: { platform: string; error: string }[] = []

  if (iosError && (platformFilter === 'ios' || platformFilter === 'both')) {
    warnings.push({ platform: 'iOS', error: iosError })
  }
  if (androidError && (platformFilter === 'android' || platformFilter === 'both')) {
    warnings.push({ platform: 'Android', error: androidError })
  }

  if (warnings.length === 0) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs",
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
      <span className="text-yellow-700 dark:text-yellow-400">
        {warnings.map((w, i) => (
          <React.Fragment key={w.platform}>
            {i > 0 && ' • '}
            <strong>{w.platform}:</strong> {w.error}
          </React.Fragment>
        ))}
      </span>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

/**
 * AppSearchInput - A debounced search input component for app store search
 *
 * Features:
 * - Debounced search to prevent excessive API calls
 * - Minimum character requirement before triggering search
 * - Loading state indicator
 * - Clear button to reset the input
 * - Accessible keyboard navigation
 * - Search results dropdown with app cards
 * - Click outside to close dropdown
 *
 * @example
 * ```tsx
 * <AppSearchInput
 *   onSearch={(query) => handleSearch(query)}
 *   onAppSelect={(app) => handleAppSelect(app)}
 *   results={searchResults}
 *   isLoading={isSearching}
 *   placeholder="Search apps..."
 *   debounceMs={300}
 *   minChars={2}
 *   showPlatformToggle
 *   platformFilter="both"
 *   onPlatformChange={(platform) => setPlatformFilter(platform)}
 * />
 * ```
 */
export function AppSearchInput({
  onSearch,
  onAppSelect,
  placeholder = "Search apps...",
  debounceMs = 300,
  minChars = 2,
  disabled = false,
  className,
  defaultValue = "",
  value: controlledValue,
  onChange,
  isLoading = false,
  autoFocus = false,
  results = [],
  showDropdown: controlledShowDropdown,
  noResultsMessage = "No apps found. Try a different search term.",
  error = null,
  platformFilter: controlledPlatformFilter,
  onPlatformChange,
  showPlatformToggle = false,
}: AppSearchInputProps) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = React.useState(defaultValue)

  // Dropdown visibility state
  const [internalShowDropdown, setInternalShowDropdown] = React.useState(false)

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  // Track if user has performed a search (for showing "no results")
  const [hasSearched, setHasSearched] = React.useState(false)

  // Internal state for uncontrolled platform filter mode
  const [internalPlatformFilter, setInternalPlatformFilter] = React.useState<PlatformFilter>('both')

  // Determine if component is controlled or uncontrolled
  const isControlled = controlledValue !== undefined
  const inputValue = isControlled ? controlledValue : internalValue

  // Determine if dropdown visibility is controlled
  const isDropdownControlled = controlledShowDropdown !== undefined
  const showDropdown = isDropdownControlled ? controlledShowDropdown : internalShowDropdown

  // Determine if platform filter is controlled
  const isPlatformControlled = controlledPlatformFilter !== undefined
  const platformFilter = isPlatformControlled ? controlledPlatformFilter : internalPlatformFilter

  // Debounce the input value
  const debouncedValue = useDebounce(inputValue, debounceMs)

  // Track if this is the initial mount to prevent triggering search on mount
  const isInitialMount = React.useRef(true)

  // Ref for the input element
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Ref for the container element (for click outside detection)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Effect to call onSearch when debounced value changes
  React.useEffect(() => {
    // Skip the initial mount to avoid searching with default/empty value
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Only trigger search if we have enough characters
    if (debouncedValue.length >= minChars) {
      onSearch?.(debouncedValue)
      setHasSearched(true)
      if (!isDropdownControlled) {
        setInternalShowDropdown(true)
      }
    } else if (debouncedValue.length === 0) {
      // Optionally notify when cleared
      onSearch?.("")
      setHasSearched(false)
      if (!isDropdownControlled) {
        setInternalShowDropdown(false)
      }
    }
  }, [debouncedValue, minChars, onSearch, isDropdownControlled])

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  // Click outside handler to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (!isDropdownControlled) {
          setInternalShowDropdown(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownControlled])

  // Handler for input changes
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      if (!isControlled) {
        setInternalValue(newValue)
      }

      onChange?.(newValue)
    },
    [isControlled, onChange]
  )

  // Handler for clearing the input
  const handleClear = React.useCallback(() => {
    if (!isControlled) {
      setInternalValue("")
    }

    onChange?.("")
    onSearch?.("")
    setHasSearched(false)
    setSelectedIndex(-1)

    if (!isDropdownControlled) {
      setInternalShowDropdown(false)
    }

    // Focus the input after clearing
    inputRef.current?.focus()
  }, [isControlled, isDropdownControlled, onChange, onSearch])

  // Handler for selecting an app
  const handleSelectApp = React.useCallback(
    (app: AppSearchResult) => {
      onAppSelect?.(app)
      if (!isDropdownControlled) {
        setInternalShowDropdown(false)
      }
    },
    [onAppSelect, isDropdownControlled]
  )

  // Handler for hovering over an app
  const handleHoverApp = React.useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  // Handler for keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Clear on Escape
      if (e.key === "Escape") {
        if (showDropdown) {
          if (!isDropdownControlled) {
            setInternalShowDropdown(false)
          }
          e.preventDefault()
        } else {
          handleClear()
          e.preventDefault()
        }
        return
      }

      // Navigate dropdown with arrow keys
      if (showDropdown && results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          )
        } else if (e.key === "ArrowUp") {
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          )
        } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
          e.preventDefault()
          handleSelectApp(results[selectedIndex])
        }
      }
    },
    [handleClear, handleSelectApp, isDropdownControlled, results, selectedIndex, showDropdown]
  )

  // Handler for input focus
  const handleFocus = React.useCallback(() => {
    // Show dropdown when focusing if there are results or has searched
    if ((results.length > 0 || hasSearched) && !isDropdownControlled) {
      setInternalShowDropdown(true)
    }
  }, [results.length, hasSearched, isDropdownControlled])

  // Handler for platform filter changes
  const handlePlatformChange = React.useCallback(
    (newPlatform: PlatformFilter) => {
      if (!isPlatformControlled) {
        setInternalPlatformFilter(newPlatform)
      }
      onPlatformChange?.(newPlatform)
    },
    [isPlatformControlled, onPlatformChange]
  )

  // Calculate if we should show the hint
  const showMinCharsHint = inputValue.length > 0 && inputValue.length < minChars

  // Determine if dropdown should be visible
  const isDropdownVisible: boolean =
    showDropdown &&
    inputValue.length >= minChars &&
    (isLoading || hasSearched || results.length > 0 || Boolean(error))

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Platform toggle (above search input) */}
      {showPlatformToggle && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Search in:</span>
          <PlatformToggle
            value={platformFilter}
            onChange={handlePlatformChange}
            disabled={disabled}
            size="sm"
          />
        </div>
      )}

      {/* Search input container */}
      <div ref={containerRef} className="relative w-full">
        {/* Search icon */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Input field */}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "pl-9 pr-9",
            showMinCharsHint && "border-yellow-500/50 focus-visible:border-yellow-500"
          )}
          aria-label="Search apps"
          aria-describedby={showMinCharsHint ? "search-hint" : undefined}
          aria-expanded={isDropdownVisible}
          aria-haspopup="listbox"
          aria-controls={isDropdownVisible ? "search-results-dropdown" : undefined}
          aria-activedescendant={
            selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
          }
          role="combobox"
          autoComplete="off"
        />

        {/* Clear button */}
        {inputValue.length > 0 && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Minimum characters hint */}
        {showMinCharsHint && (
          <p
            id="search-hint"
            className="mt-1 text-xs text-yellow-600 dark:text-yellow-500"
          >
            Type at least {minChars} characters to search
          </p>
        )}

        {/* Search results dropdown */}
        <SearchResultsDropdown
          results={results}
          isLoading={isLoading}
          isOpen={Boolean(isDropdownVisible)}
          selectedIndex={selectedIndex}
          onSelect={handleSelectApp}
          onHover={handleHoverApp}
          noResultsMessage={noResultsMessage}
          error={error}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  )
}

// ============================================================================
// API Integration Hook
// ============================================================================

/**
 * API response type for app store search
 */
interface AppStoreSearchApiResponse {
  success: boolean
  data?: {
    query: string
    ios: AppSearchResult[]
    android: AppSearchResult[]
    iosSuccess: boolean
    androidSuccess: boolean
    iosError?: string
    androidError?: string
  }
  error?: {
    code: string
    message: string
    retryable: boolean
    retryAfterMs?: number
  }
}

/**
 * Categorize error type from error code or message
 */
function categorizeError(code?: string, message?: string, httpStatus?: number): SearchErrorType {
  // Check HTTP status codes first
  if (httpStatus === 429) return 'rate_limit'
  if (httpStatus && httpStatus >= 500) return 'server'

  // Check error codes
  if (code) {
    const codeLower = code.toLowerCase()
    if (codeLower.includes('rate') || codeLower === 'rate_limited') return 'rate_limit'
    if (codeLower.includes('timeout')) return 'timeout'
    if (codeLower.includes('network') || codeLower === 'network_error') return 'network'
    if (codeLower.includes('server') || codeLower === 'store_unavailable') return 'server'
  }

  // Check error message
  if (message) {
    const msgLower = message.toLowerCase()
    if (msgLower.includes('rate limit') || msgLower.includes('too many')) return 'rate_limit'
    if (msgLower.includes('timeout') || msgLower.includes('timed out')) return 'timeout'
    if (msgLower.includes('network') || msgLower.includes('connection') || msgLower.includes('fetch')) return 'network'
    if (msgLower.includes('server') || msgLower.includes('unavailable')) return 'server'
  }

  return 'unknown'
}

/**
 * Options for the useAppSearch hook
 */
export interface UseAppSearchOptions {
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number
  /** Minimum characters required to trigger search (default: 2) */
  minChars?: number
  /** Initial platform filter (default: 'both') */
  initialPlatformFilter?: PlatformFilter
  /** Maximum results per platform (default: 10) */
  limit?: number
  /** Country code for app stores (default: 'us') */
  country?: string
  /** Language code (default: 'en') */
  language?: string
  /** Callback when search completes successfully */
  onSearchComplete?: (results: AppSearchResult[]) => void
  /** Callback when search fails */
  onSearchError?: (error: string) => void
  /** Callback when an app is selected */
  onAppSelect?: (app: AppSearchResult) => void
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number
}

/**
 * Return type for the useAppSearch hook
 */
export interface UseAppSearchReturn {
  /** Current search query */
  query: string
  /** Set the search query */
  setQuery: (query: string) => void
  /** Whether a search is in progress */
  isLoading: boolean
  /** Search results */
  results: AppSearchResult[]
  /** Error message if search failed */
  error: string | null
  /** Structured error info with type and retry settings */
  errorInfo: SearchErrorInfo | null
  /** Whether the error is retryable */
  isRetryable: boolean
  /** Retry the last search */
  retry: () => void
  /** Clear search results and error */
  clear: () => void
  /** Select an app from results */
  selectApp: (app: AppSearchResult) => void
  /** Currently selected app */
  selectedApp: AppSearchResult | null
  /** Whether results are from iOS */
  hasIosResults: boolean
  /** Whether results are from Android */
  hasAndroidResults: boolean
  /** iOS-specific error message */
  iosError: string | null
  /** Android-specific error message */
  androidError: string | null
  /** Current platform filter */
  platformFilter: PlatformFilter
  /** Set the platform filter */
  setPlatformFilter: (platform: PlatformFilter) => void
}

/**
 * Custom hook for searching app stores via API
 *
 * Handles:
 * - Debounced search queries
 * - API calls to /api/app-store
 * - Error handling with retry capability
 * - Request cancellation for stale requests
 * - Loading and error states
 *
 * @param options - Configuration options
 * @returns Search state and controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     query,
 *     setQuery,
 *     results,
 *     isLoading,
 *     error,
 *     retry,
 *     selectApp,
 *   } = useAppSearch({
 *     onAppSelect: (app) => console.log('Selected:', app.name),
 *   });
 *
 *   return (
 *     <AppSearchInput
 *       value={query}
 *       onChange={setQuery}
 *       results={results}
 *       isLoading={isLoading}
 *       error={error}
 *       onAppSelect={selectApp}
 *     />
 *   );
 * }
 * ```
 */
export function useAppSearch(options: UseAppSearchOptions = {}): UseAppSearchReturn {
  const {
    debounceMs = 300,
    minChars = 2,
    initialPlatformFilter = 'both',
    limit = 10,
    country = 'us',
    language = 'en',
    onSearchComplete,
    onSearchError,
    onAppSelect,
    timeoutMs = 10000,
  } = options

  // State
  const [query, setQuery] = React.useState('')
  const [platformFilter, setPlatformFilter] = React.useState<PlatformFilter>(initialPlatformFilter)
  const [isLoading, setIsLoading] = React.useState(false)
  const [results, setResults] = React.useState<AppSearchResult[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [errorInfo, setErrorInfo] = React.useState<SearchErrorInfo | null>(null)
  const [isRetryable, setIsRetryable] = React.useState(false)
  const [selectedApp, setSelectedApp] = React.useState<AppSearchResult | null>(null)
  const [iosError, setIosError] = React.useState<string | null>(null)
  const [androidError, setAndroidError] = React.useState<string | null>(null)
  const [hasIosResults, setHasIosResults] = React.useState(false)
  const [hasAndroidResults, setHasAndroidResults] = React.useState(false)

  // Convert platform filter to platforms array for API
  const platforms: AppStorePlatform[] = React.useMemo(() => {
    if (platformFilter === 'both') return ['ios', 'android']
    return [platformFilter]
  }, [platformFilter])

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceMs)

  // Abort controller ref for cancelling stale requests
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Last searched query for retry functionality
  const lastSearchedQueryRef = React.useRef<string>('')

  /**
   * Execute a search against the API
   */
  const executeSearch = React.useCallback(
    async (searchQuery: string) => {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      const controller = new AbortController()
      abortControllerRef.current = controller

      // Track the query for retry
      lastSearchedQueryRef.current = searchQuery

      // Reset state
      setIsLoading(true)
      setError(null)
      setErrorInfo(null)
      setIsRetryable(false)
      setIosError(null)
      setAndroidError(null)

      try {
        // Set up timeout
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        // Make API request
        const response = await fetch('/api/app-store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            platforms,
            limit,
            country,
            language,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Check if request was aborted
        if (controller.signal.aborted) {
          return
        }

        // Parse response
        const data: AppStoreSearchApiResponse = await response.json()

        // Handle API error response
        if (!data.success || !data.data) {
          const errorMessage = data.error?.message || 'Search failed. Please try again.'
          const retryable = data.error?.retryable ?? true
          const errorType = categorizeError(data.error?.code, errorMessage, response.status)

          const newErrorInfo: SearchErrorInfo = {
            type: errorType,
            message: errorMessage,
            code: data.error?.code as AppStoreErrorCode | undefined,
            retryable,
            retryAfterMs: data.error?.retryAfterMs,
          }

          setError(errorMessage)
          setErrorInfo(newErrorInfo)
          setIsRetryable(retryable)
          setResults([])
          setHasIosResults(false)
          setHasAndroidResults(false)
          onSearchError?.(errorMessage)
          return
        }

        // Process successful response
        const { ios, android, iosSuccess, androidSuccess, iosError: iosErr, androidError: androidErr } = data.data

        // Combine results (iOS first, then Android)
        const combinedResults = [...ios, ...android]

        // Update state
        setResults(combinedResults)
        setHasIosResults(iosSuccess && ios.length > 0)
        setHasAndroidResults(androidSuccess && android.length > 0)
        setIosError(iosErr || null)
        setAndroidError(androidErr || null)

        // Set partial error if one platform failed but we have results from the other
        if (!iosSuccess && !androidSuccess) {
          const bothFailedMessage = 'Search failed on both platforms. Please try again.'
          setError(bothFailedMessage)
          setErrorInfo({
            type: 'server',
            message: bothFailedMessage,
            retryable: true,
          })
          setIsRetryable(true)
        } else if (!iosSuccess && platforms.includes('ios')) {
          // Partial failure - show warning but not blocking error
          setIosError(iosErr || 'iOS search failed')
        } else if (!androidSuccess && platforms.includes('android')) {
          // Partial failure - show warning but not blocking error
          setAndroidError(androidErr || 'Android search failed')
        }

        onSearchComplete?.(combinedResults)
      } catch (err) {
        // Check if request was aborted (user started new search)
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Check if it was a timeout abort
          const isTimeout = !controller.signal.aborted
          if (isTimeout) {
            const timeoutMessage = 'Request timed out. Please try again.'
            setError(timeoutMessage)
            setErrorInfo({
              type: 'timeout',
              message: timeoutMessage,
              retryable: true,
            })
            setIsRetryable(true)
            setResults([])
            setHasIosResults(false)
            setHasAndroidResults(false)
            onSearchError?.(timeoutMessage)
          }
          return
        }

        // Handle network errors
        let errorMessage = 'Network error. Please check your connection and try again.'
        let errorType: SearchErrorType = 'network'

        if (err instanceof TypeError && err.message.includes('fetch')) {
          errorMessage = 'Unable to connect to the server. Please try again.'
          errorType = 'network'
        } else if (err instanceof Error) {
          errorMessage = err.message
          errorType = categorizeError(undefined, errorMessage)
        }

        setError(errorMessage)
        setErrorInfo({
          type: errorType,
          message: errorMessage,
          retryable: true,
        })
        setIsRetryable(true)
        setResults([])
        setHasIosResults(false)
        setHasAndroidResults(false)
        onSearchError?.(errorMessage)
      } finally {
        // Only update loading state if this is still the current request
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [platforms, limit, country, language, timeoutMs, onSearchComplete, onSearchError]
  )

  // Effect to trigger search when debounced query or platform filter changes
  React.useEffect(() => {
    if (debouncedQuery.length >= minChars) {
      executeSearch(debouncedQuery)
    } else if (debouncedQuery.length === 0) {
      // Clear results when query is cleared
      setResults([])
      setError(null)
      setErrorInfo(null)
      setIsRetryable(false)
      setIosError(null)
      setAndroidError(null)
      setHasIosResults(false)
      setHasAndroidResults(false)
    }
    // Note: executeSearch dependency includes platforms, which changes when platformFilter changes
  }, [debouncedQuery, minChars, executeSearch])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Retry the last search
   */
  const retry = React.useCallback(() => {
    if (lastSearchedQueryRef.current) {
      executeSearch(lastSearchedQueryRef.current)
    }
  }, [executeSearch])

  /**
   * Clear search results and error
   */
  const clear = React.useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setErrorInfo(null)
    setIsRetryable(false)
    setSelectedApp(null)
    setIosError(null)
    setAndroidError(null)
    setHasIosResults(false)
    setHasAndroidResults(false)
    lastSearchedQueryRef.current = ''

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Select an app from results
   */
  const selectApp = React.useCallback(
    (app: AppSearchResult) => {
      setSelectedApp(app)
      onAppSelect?.(app)
    },
    [onAppSelect]
  )

  return {
    query,
    setQuery,
    isLoading,
    results,
    error,
    errorInfo,
    isRetryable,
    retry,
    clear,
    selectApp,
    selectedApp,
    hasIosResults,
    hasAndroidResults,
    iosError,
    androidError,
    platformFilter,
    setPlatformFilter,
  }
}

// ============================================================================
// Connected Component
// ============================================================================

/**
 * Props for ConnectedAppSearchInput
 */
export interface ConnectedAppSearchInputProps {
  /** Callback when an app is selected */
  onAppSelect?: (app: AppSearchResult) => void
  /** Callback when search completes */
  onSearchComplete?: (results: AppSearchResult[]) => void
  /** Callback when search fails */
  onSearchError?: (error: string) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number
  /** Minimum characters required to trigger search (default: 2) */
  minChars?: number
  /** Initial platform filter (default: 'both') */
  initialPlatformFilter?: PlatformFilter
  /** Maximum results per platform (default: 10) */
  limit?: number
  /** Country code for app stores (default: 'us') */
  country?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
  /** Auto focus the input on mount */
  autoFocus?: boolean
  /** Message to show when no results are found */
  noResultsMessage?: string
  /** Whether to show the platform toggle (default: true) */
  showPlatformToggle?: boolean
}

/**
 * ConnectedAppSearchInput - AppSearchInput wired to the API route
 *
 * This is a convenience component that combines AppSearchInput with the
 * useAppSearch hook for a fully integrated search experience.
 *
 * Features:
 * - Automatic API integration via /api/app-store
 * - Debounced search queries
 * - Error handling with retry capability
 * - Loading states
 * - Request cancellation for stale requests
 * - Platform toggle (iOS/Android/Both)
 *
 * @example
 * ```tsx
 * <ConnectedAppSearchInput
 *   onAppSelect={(app) => {
 *     console.log('Selected app:', app.name);
 *     setSelectedApp(app);
 *   }}
 *   placeholder="Search for apps..."
 *   showPlatformToggle
 *   initialPlatformFilter="both"
 * />
 * ```
 */
export function ConnectedAppSearchInput({
  onAppSelect,
  onSearchComplete,
  onSearchError,
  placeholder = "Search apps...",
  debounceMs = 300,
  minChars = 2,
  initialPlatformFilter = 'both',
  limit = 10,
  country = 'us',
  disabled = false,
  className,
  autoFocus = false,
  noResultsMessage = "No apps found. Try a different search term.",
  showPlatformToggle = true,
}: ConnectedAppSearchInputProps) {
  const {
    query,
    setQuery,
    isLoading,
    results,
    error,
    errorInfo,
    isRetryable,
    retry,
    selectApp,
    iosError,
    androidError,
    platformFilter,
    setPlatformFilter,
  } = useAppSearch({
    debounceMs,
    minChars,
    initialPlatformFilter,
    limit,
    country,
    onSearchComplete,
    onSearchError,
    onAppSelect,
  })

  // Determine if we have partial failures (one platform failed but we have results from another)
  const hasPartialFailure = React.useMemo(() => {
    const hasResults = results.length > 0
    const hasIosError = Boolean(iosError) && (platformFilter === 'ios' || platformFilter === 'both')
    const hasAndroidError = Boolean(androidError) && (platformFilter === 'android' || platformFilter === 'both')
    return hasResults && (hasIosError || hasAndroidError)
  }, [results.length, iosError, androidError, platformFilter])

  // Build error message for inline display (only shown when no errorInfo for full error state)
  const displayError = React.useMemo(() => {
    // Don't show inline error if we have errorInfo (will show ErrorStateDisplay instead)
    if (errorInfo && !hasPartialFailure) return null
    if (error && !hasPartialFailure) return null
    return null // Let the dropdown handle simple errors
  }, [error, errorInfo, hasPartialFailure])

  return (
    <div className={cn("relative space-y-3", className)}>
      <AppSearchInput
        value={query}
        onChange={setQuery}
        onAppSelect={selectApp}
        results={results}
        isLoading={isLoading}
        error={displayError}
        placeholder={placeholder}
        debounceMs={0} // We handle debouncing in the hook
        minChars={minChars}
        disabled={disabled}
        autoFocus={autoFocus}
        noResultsMessage={noResultsMessage}
        showPlatformToggle={showPlatformToggle}
        platformFilter={platformFilter}
        onPlatformChange={setPlatformFilter}
      />

      {/* Enhanced error state display for full errors */}
      {errorInfo && !hasPartialFailure && (
        <ErrorStateDisplay
          error={errorInfo}
          onRetry={isRetryable ? retry : undefined}
          isRetrying={isLoading}
        />
      )}

      {/* Partial failure warning when we have results but one platform failed */}
      {hasPartialFailure && (
        <PartialFailureWarning
          iosError={iosError}
          androidError={androidError}
          platformFilter={platformFilter}
        />
      )}
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

// Export the useDebounce hook for reuse
export { useDebounce, useCountdown }

// Export helper components for potential reuse
export { AppCard, AppCardSkeleton, PlatformBadge, PlatformIcon, PlatformToggle, SearchResultsDropdown }

// Export error state components
export { ErrorStateDisplay, InlineErrorDisplay, PartialFailureWarning }

// Export types for external use
export type { AppCardProps, PlatformToggleProps, SearchResultsDropdownProps, ErrorStateDisplayProps, InlineErrorDisplayProps, PartialFailureWarningProps }
