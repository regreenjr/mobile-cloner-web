"use client"

import * as React from "react"
import Image from "next/image"
import { ImageOff, Apple, Smartphone, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AppStoreScreenshot, AppStorePlatform } from "@/types/appStore"

// ============================================================================
// Types
// ============================================================================

export interface ScreenshotGalleryProps {
  /** Array of screenshots to display */
  screenshots: AppStoreScreenshot[]
  /** Callback when a screenshot is clicked */
  onScreenshotClick?: (screenshot: AppStoreScreenshot, index: number) => void
  /** Callback when screenshot selection changes */
  onSelectionChange?: (screenshots: AppStoreScreenshot[]) => void
  /** Whether selection mode is enabled */
  selectable?: boolean
  /** Additional class names for the container */
  className?: string
  /** Number of columns in the grid (responsive by default) */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Gap between grid items in pixels */
  gap?: "sm" | "md" | "lg"
  /** Aspect ratio for screenshot thumbnails */
  aspectRatio?: "auto" | "portrait" | "landscape"
  /** Whether to show platform badges on screenshots */
  showPlatformBadge?: boolean
  /** Empty state message when no screenshots */
  emptyMessage?: string
  /** Whether the gallery is in a loading state */
  isLoading?: boolean
  /** Number of skeleton items to show when loading */
  skeletonCount?: number
  /** Whether to enable enlargement dialog on click (default: true) */
  enableEnlargement?: boolean
}

export interface ScreenshotDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Array of screenshots for navigation */
  screenshots: AppStoreScreenshot[]
  /** Index of the currently displayed screenshot */
  currentIndex: number
  /** Callback when navigating to a different screenshot */
  onNavigate: (index: number) => void
  /** Whether to show platform badges */
  showPlatformBadge?: boolean
}

export interface ScreenshotItemProps {
  /** The screenshot data */
  screenshot: AppStoreScreenshot
  /** Index of the screenshot in the array */
  index: number
  /** Whether this screenshot is selected */
  isSelected: boolean
  /** Whether selection mode is enabled */
  selectable: boolean
  /** Callback when clicked */
  onClick: () => void
  /** Aspect ratio for the thumbnail */
  aspectRatio: "auto" | "portrait" | "landscape"
  /** Whether to show platform badge */
  showPlatformBadge: boolean
}

// ============================================================================
// Constants
// ============================================================================

const GRID_COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
} as const

const GAP_SIZES = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const

const ASPECT_RATIOS = {
  auto: "",
  portrait: "aspect-[9/16]",
  landscape: "aspect-[16/9]",
} as const

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Platform icon for screenshots
 */
function PlatformIcon({ platform, className }: { platform: AppStorePlatform; className?: string }) {
  if (platform === "ios") {
    return <Apple className={cn("h-3 w-3", className)} />
  }
  return <Smartphone className={cn("h-3 w-3", className)} />
}

/**
 * Small platform badge for screenshot corners
 */
function ScreenshotPlatformBadge({ platform }: { platform: AppStorePlatform }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "absolute top-2 left-2 gap-1 text-[10px] px-1.5 py-0.5 backdrop-blur-sm",
        platform === "ios"
          ? "bg-gray-900/70 text-white"
          : "bg-green-900/70 text-white"
      )}
    >
      <PlatformIcon platform={platform} className="h-2.5 w-2.5" />
      {platform === "ios" ? "iOS" : "Android"}
    </Badge>
  )
}

/**
 * Selection indicator overlay
 */
function SelectionIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={cn(
        "absolute top-2 right-2 h-5 w-5 rounded-full border-2 transition-all",
        isSelected
          ? "bg-primary border-primary"
          : "bg-background/80 border-muted-foreground/50 backdrop-blur-sm"
      )}
    >
      {isSelected && (
        <svg
          className="h-full w-full text-primary-foreground"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  )
}

/**
 * Individual screenshot item in the gallery
 */
function ScreenshotItem({
  screenshot,
  index,
  isSelected,
  selectable,
  onClick,
  aspectRatio,
  showPlatformBadge,
}: ScreenshotItemProps) {
  const [imageError, setImageError] = React.useState(false)
  const [isImageLoaded, setIsImageLoaded] = React.useState(false)

  // Determine aspect ratio class
  const aspectClass = aspectRatio === "auto"
    ? screenshot.orientation === "landscape"
      ? "aspect-[16/9]"
      : "aspect-[9/16]"
    : ASPECT_RATIOS[aspectRatio]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-muted transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "hover:ring-2 hover:ring-primary/50",
        selectable && isSelected && "ring-2 ring-primary",
        aspectClass
      )}
      aria-label={`Screenshot ${index + 1}${isSelected ? " (selected)" : ""}`}
      aria-pressed={selectable ? isSelected : undefined}
    >
      {/* Image container */}
      <div className="relative h-full w-full">
        {!imageError && screenshot.url ? (
          <>
            {/* Placeholder shimmer while loading */}
            {!isImageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}
            <Image
              src={screenshot.url}
              alt={`Screenshot ${index + 1}`}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setImageError(true)}
              unoptimized // External URLs from app stores
            />
          </>
        ) : (
          // Error/fallback state
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Hover overlay with zoom indicator */}
      <div
        className={cn(
          "absolute inset-0 bg-black/0 transition-colors flex items-center justify-center",
          "group-hover:bg-black/20"
        )}
      >
        {/* Zoom icon shown on hover when not in selection mode */}
        {!selectable && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
              <ZoomIn className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Platform badge */}
      {showPlatformBadge && <ScreenshotPlatformBadge platform={screenshot.platform} />}

      {/* Selection indicator */}
      {selectable && <SelectionIndicator isSelected={isSelected} />}

      {/* Screenshot order indicator */}
      <div className="absolute bottom-2 right-2">
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {index + 1}
        </span>
      </div>
    </button>
  )
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8">
      <ImageOff className="mb-3 h-12 w-12 text-muted-foreground/50" />
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/**
 * Skeleton loading state for a single screenshot
 * Simulates the appearance of a loading screenshot with shimmer effects
 */
export interface ScreenshotSkeletonProps {
  /** Aspect ratio for the skeleton */
  aspectRatio?: "auto" | "portrait" | "landscape"
  /** Whether to show a simulated platform badge */
  showPlatformBadge?: boolean
  /** Index for staggered animation delays */
  index?: number
}

function ScreenshotSkeleton({
  aspectRatio = "portrait",
  showPlatformBadge = false,
  index = 0,
}: ScreenshotSkeletonProps) {
  // Staggered animation delay for visual effect
  const animationDelay = `${index * 75}ms`

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        aspectRatio === "landscape" ? "aspect-[16/9]" : "aspect-[9/16]"
      )}
      style={{ animationDelay }}
    >
      {/* Main skeleton background with shimmer */}
      <Skeleton className="absolute inset-0 rounded-lg" />

      {/* Simulated platform badge skeleton */}
      {showPlatformBadge && (
        <div className="absolute top-2 left-2">
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      )}

      {/* Simulated content area - mimics app UI elements */}
      <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
        {/* Simulated status bar or header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-2 w-12 rounded-full" />
          <Skeleton className="h-2 w-8 rounded-full" />
        </div>

        {/* Simulated content lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-2 w-4/5 rounded-full" />
          <Skeleton className="h-2 w-3/5 rounded-full" />
        </div>
      </div>

      {/* Simulated screenshot index badge */}
      <div className="absolute bottom-2 right-2">
        <Skeleton className="h-5 w-6 rounded" />
      </div>

      {/* Shimmer overlay animation */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{ animationDelay }}
      />
    </div>
  )
}

/**
 * Loading skeleton grid for the screenshot gallery
 * Displays multiple skeleton items in a grid layout
 */
export interface ScreenshotGallerySkeletonProps {
  /** Number of skeleton items to display */
  count?: number
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Gap between grid items */
  gap?: "sm" | "md" | "lg"
  /** Aspect ratio for skeleton items */
  aspectRatio?: "auto" | "portrait" | "landscape"
  /** Whether to show simulated platform badges */
  showPlatformBadge?: boolean
  /** Additional class names */
  className?: string
}

function ScreenshotGallerySkeleton({
  count = 6,
  columns = 4,
  gap = "md",
  aspectRatio = "portrait",
  showPlatformBadge = false,
  className,
}: ScreenshotGallerySkeletonProps) {
  return (
    <div
      className={cn(
        "grid",
        GRID_COLUMNS[columns],
        GAP_SIZES[gap],
        className
      )}
      role="status"
      aria-label="Loading screenshots"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ScreenshotSkeleton
          key={`skeleton-${index}`}
          aspectRatio={aspectRatio}
          showPlatformBadge={showPlatformBadge}
          index={index}
        />
      ))}
      <span className="sr-only">Loading screenshot gallery...</span>
    </div>
  )
}

// ============================================================================
// Screenshot Dialog Component
// ============================================================================

/**
 * ScreenshotDialog - Modal dialog for viewing enlarged screenshots
 *
 * Features:
 * - Full-screen enlarged view of screenshots
 * - Previous/Next navigation with buttons
 * - Keyboard navigation (ArrowLeft, ArrowRight, Escape)
 * - Platform badge display
 * - Loading state for images
 * - Responsive sizing
 */
function ScreenshotDialog({
  open,
  onOpenChange,
  screenshots,
  currentIndex,
  onNavigate,
  showPlatformBadge = false,
}: ScreenshotDialogProps) {
  const [imageError, setImageError] = React.useState(false)
  const [isImageLoading, setIsImageLoading] = React.useState(true)

  const currentScreenshot = screenshots[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < screenshots.length - 1

  // Reset loading/error state when screenshot changes
  React.useEffect(() => {
    setImageError(false)
    setIsImageLoading(true)
  }, [currentIndex])

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (hasPrevious) {
            e.preventDefault()
            onNavigate(currentIndex - 1)
          }
          break
        case "ArrowRight":
          if (hasNext) {
            e.preventDefault()
            onNavigate(currentIndex + 1)
          }
          break
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, hasPrevious, hasNext, currentIndex, onNavigate, onOpenChange])

  const goToPrevious = React.useCallback(() => {
    if (hasPrevious) {
      onNavigate(currentIndex - 1)
    }
  }, [hasPrevious, currentIndex, onNavigate])

  const goToNext = React.useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1)
    }
  }, [hasNext, currentIndex, onNavigate])

  if (!currentScreenshot) return null

  const isLandscape = currentScreenshot.orientation === "landscape"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-none",
          isLandscape ? "sm:max-w-[90vw]" : "sm:max-w-[500px]"
        )}
        showCloseButton={false}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          Screenshot {currentIndex + 1} of {screenshots.length}
        </DialogTitle>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          onClick={() => onOpenChange(false)}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Image container */}
        <div className="relative flex items-center justify-center min-h-[300px] max-h-[85vh]">
          {/* Loading state */}
          {isImageLoading && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="text-xs text-white/70">Loading...</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-8">
              <ImageOff className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">Failed to load screenshot</p>
            </div>
          ) : (
            <Image
              src={currentScreenshot.url}
              alt={`Screenshot ${currentIndex + 1} of ${screenshots.length}`}
              width={currentScreenshot.width || (isLandscape ? 800 : 390)}
              height={currentScreenshot.height || (isLandscape ? 450 : 844)}
              className={cn(
                "object-contain max-h-[85vh] w-auto",
                isImageLoading ? "opacity-0" : "opacity-100",
                "transition-opacity duration-300"
              )}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setImageError(true)
                setIsImageLoading(false)
              }}
              unoptimized
              priority
            />
          )}

          {/* Platform badge */}
          {showPlatformBadge && !imageError && (
            <div className="absolute top-3 left-3">
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1 text-xs px-2 py-1 backdrop-blur-sm",
                  currentScreenshot.platform === "ios"
                    ? "bg-gray-900/80 text-white"
                    : "bg-green-900/80 text-white"
                )}
              >
                <PlatformIcon platform={currentScreenshot.platform} className="h-3 w-3" />
                {currentScreenshot.platform === "ios" ? "iOS" : "Android"}
              </Badge>
            </div>
          )}
        </div>

        {/* Navigation controls */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
          {/* Previous button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white pointer-events-auto",
              "transition-opacity",
              !hasPrevious && "opacity-30 cursor-not-allowed hover:bg-black/50"
            )}
            onClick={goToPrevious}
            disabled={!hasPrevious}
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Next button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white pointer-events-auto",
              "transition-opacity",
              !hasNext && "opacity-30 cursor-not-allowed hover:bg-black/50"
            )}
            onClick={goToNext}
            disabled={!hasNext}
            aria-label="Next screenshot"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Counter and navigation indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur-sm">
            <span className="text-sm font-medium text-white">
              {currentIndex + 1} / {screenshots.length}
            </span>
            {/* Dot indicators for small galleries */}
            {screenshots.length <= 10 && (
              <div className="flex gap-1.5">
                {screenshots.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigate(idx)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      idx === currentIndex
                        ? "bg-white scale-110"
                        : "bg-white/40 hover:bg-white/60"
                    )}
                    aria-label={`Go to screenshot ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-3 right-3 hidden sm:block">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">←</kbd>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">→</kbd>
            <span>to navigate</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ScreenshotGallery - A responsive grid gallery for displaying app screenshots
 *
 * Features:
 * - Responsive grid layout with configurable columns
 * - Optional selection mode for multi-select workflows
 * - Platform badges to identify iOS vs Android screenshots
 * - Loading states with skeleton placeholders
 * - Error handling for failed image loads
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <ScreenshotGallery
 *   screenshots={app.screenshots}
 *   onScreenshotClick={(screenshot, index) => openLightbox(index)}
 *   selectable={true}
 *   onSelectionChange={(selected) => setSelectedScreenshots(selected)}
 *   columns={4}
 *   gap="md"
 * />
 * ```
 */
export function ScreenshotGallery({
  screenshots,
  onScreenshotClick,
  onSelectionChange,
  selectable = false,
  className,
  columns = 4,
  gap = "md",
  aspectRatio = "auto",
  showPlatformBadge = false,
  emptyMessage = "No screenshots available",
  isLoading = false,
  skeletonCount = 6,
  enableEnlargement = true,
}: ScreenshotGalleryProps) {
  // Track internal selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(screenshots.filter((s) => s.selected).map((s) => s.id))
  )

  // Dialog state for screenshot enlargement
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [currentDialogIndex, setCurrentDialogIndex] = React.useState(0)

  // Sync selection state when screenshots change
  React.useEffect(() => {
    setSelectedIds(new Set(screenshots.filter((s) => s.selected).map((s) => s.id)))
  }, [screenshots])

  // Handle dialog navigation
  const handleDialogNavigate = React.useCallback((index: number) => {
    setCurrentDialogIndex(index)
  }, [])

  // Handle screenshot click
  const handleScreenshotClick = React.useCallback(
    (screenshot: AppStoreScreenshot, index: number) => {
      if (selectable) {
        // Toggle selection
        setSelectedIds((prev) => {
          const newSet = new Set(prev)
          if (newSet.has(screenshot.id)) {
            newSet.delete(screenshot.id)
          } else {
            newSet.add(screenshot.id)
          }

          // Notify parent of selection change
          const updatedScreenshots = screenshots.map((s) => ({
            ...s,
            selected: newSet.has(s.id),
          }))
          onSelectionChange?.(updatedScreenshots)

          return newSet
        })
      }

      // Open enlargement dialog if enabled (and not in selection mode)
      if (enableEnlargement && !selectable) {
        setCurrentDialogIndex(index)
        setDialogOpen(true)
      }

      // Always call the click handler (for lightbox etc.)
      onScreenshotClick?.(screenshot, index)
    },
    [selectable, screenshots, onScreenshotClick, onSelectionChange, enableEnlargement]
  )

  // Show empty state if no screenshots and not loading
  if (!isLoading && screenshots.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  // Grid class based on configuration
  const gridClass = cn(
    "grid",
    GRID_COLUMNS[columns],
    GAP_SIZES[gap],
    className
  )

  // Render loading skeletons
  if (isLoading) {
    return (
      <ScreenshotGallerySkeleton
        count={skeletonCount}
        columns={columns}
        gap={gap}
        aspectRatio={aspectRatio}
        showPlatformBadge={showPlatformBadge}
        className={className}
      />
    )
  }

  return (
    <>
      <div className={gridClass} role="list" aria-label="Screenshot gallery">
        {screenshots.map((screenshot, index) => (
          <ScreenshotItem
            key={screenshot.id}
            screenshot={screenshot}
            index={index}
            isSelected={selectedIds.has(screenshot.id)}
            selectable={selectable}
            onClick={() => handleScreenshotClick(screenshot, index)}
            aspectRatio={aspectRatio}
            showPlatformBadge={showPlatformBadge}
          />
        ))}
      </div>

      {/* Screenshot enlargement dialog */}
      {enableEnlargement && screenshots.length > 0 && (
        <ScreenshotDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          screenshots={screenshots}
          currentIndex={currentDialogIndex}
          onNavigate={handleDialogNavigate}
          showPlatformBadge={showPlatformBadge}
        />
      )}
    </>
  )
}

// ============================================================================
// Exports
// ============================================================================

// Export sub-components for potential reuse
export {
  ScreenshotItem,
  ScreenshotPlatformBadge,
  SelectionIndicator,
  EmptyState,
  ScreenshotSkeleton,
  ScreenshotGallerySkeleton,
  ScreenshotDialog,
}
