"use client"

import * as React from "react"
import { Search, Smartphone, ImageIcon, Info, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  ConnectedAppSearchInput,
  PlatformBadge,
} from "@/components/AppSearchInput"
import { ScreenshotGallery } from "@/components/ScreenshotGallery"
import type { AppSearchResult, AppStoreScreenshot } from "@/types/appStore"

// ============================================================================
// Types
// ============================================================================

interface SelectedAppDetailsProps {
  app: AppSearchResult
  isLoadingScreenshots: boolean
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Displays details about the selected app
 */
function SelectedAppDetails({ app, isLoadingScreenshots }: SelectedAppDetailsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-muted shadow-sm">
            {app.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.iconUrl}
                alt={`${app.name} icon`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl truncate">{app.name}</CardTitle>
              <PlatformBadge platform={app.platform} />
            </div>
            <CardDescription className="mt-1">
              {app.developer}
            </CardDescription>
            {app.category && (
              <Badge variant="outline" className="mt-2 text-xs">
                {app.category}
              </Badge>
            )}
          </div>

          {/* Rating */}
          {app.rating !== undefined && app.rating > 0 && (
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-yellow-500 text-lg">★</span>
                <span className="font-semibold">{app.rating.toFixed(1)}</span>
              </div>
              {app.ratingCount && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {app.ratingCount.toLocaleString()} ratings
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading indicator for screenshots */}
        {isLoadingScreenshots && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading screenshots...</span>
          </div>
        )}

        {/* Screenshot count info */}
        {!isLoadingScreenshots && app.screenshots.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <ImageIcon className="h-4 w-4" />
            <span>{app.screenshots.length} screenshots available</span>
          </div>
        )}

        {/* Store link */}
        {app.storeUrl && (
          <a
            href={app.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View in {app.platform === "ios" ? "App Store" : "Play Store"} →
          </a>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Empty state when no app is selected
 */
function EmptyAppState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center min-h-[200px] py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No App Selected
        </h3>
        <p className="text-sm text-muted-foreground/70 text-center max-w-[300px]">
          Search for an app above and select it to view its screenshots
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Information alert about the feature
 */
function FeatureInfo() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        Search both iOS App Store and Google Play Store to find apps and view their screenshots.
        Click on any screenshot to enlarge it.
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AppSearchPage - Demo page integrating AppSearchInput and ScreenshotGallery
 *
 * Features:
 * - Unified search across iOS and Android app stores
 * - Platform toggle to filter by iOS, Android, or Both
 * - Search results dropdown with app details
 * - Screenshot gallery with grid layout
 * - Screenshot enlargement dialog
 * - Loading states and error handling
 * - Responsive design
 */
export default function AppSearchPage() {
  // State for selected app and its screenshots
  const [selectedApp, setSelectedApp] = React.useState<AppSearchResult | null>(null)
  const [screenshots, setScreenshots] = React.useState<AppStoreScreenshot[]>([])
  const [isLoadingScreenshots, setIsLoadingScreenshots] = React.useState(false)
  const [screenshotError, setScreenshotError] = React.useState<string | null>(null)

  /**
   * Handle app selection from search results
   * Fetches full app details including screenshots if needed
   */
  const handleAppSelect = React.useCallback(async (app: AppSearchResult) => {
    setSelectedApp(app)
    setScreenshotError(null)

    // If app already has screenshots, use them directly
    if (app.screenshots && app.screenshots.length > 0) {
      setScreenshots(app.screenshots)
      return
    }

    // Otherwise, fetch app details to get screenshots
    setIsLoadingScreenshots(true)
    setScreenshots([])

    try {
      const response = await fetch(
        `/api/app-store?id=${encodeURIComponent(app.id)}&platform=${app.platform}`
      )
      const data = await response.json()

      if (data.success && data.data) {
        setScreenshots(data.data.screenshots || [])
      } else {
        setScreenshotError(data.error?.message || "Failed to load screenshots")
        setScreenshots([])
      }
    } catch (error) {
      console.error("Error fetching app details:", error)
      setScreenshotError("Failed to load screenshots. Please try again.")
      setScreenshots([])
    } finally {
      setIsLoadingScreenshots(false)
    }
  }, [])

  /**
   * Handle screenshot click (optional - for future features like import)
   */
  const handleScreenshotClick = React.useCallback(
    (screenshot: AppStoreScreenshot, index: number) => {
      // The ScreenshotGallery component handles the enlargement dialog internally
      // This callback can be used for additional actions like importing
      console.log("Screenshot clicked:", { screenshot, index })
    },
    []
  )

  return (
    <div className="container py-12">
      {/* Page Header */}
      <section className="mx-auto max-w-3xl text-center mb-8">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          App Store Search
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Search iOS and Android app stores to find apps and view their screenshots.
        </p>
      </section>

      {/* Feature Info */}
      <section className="mx-auto max-w-4xl">
        <FeatureInfo />
      </section>

      {/* Search Section */}
      <section className="mx-auto max-w-2xl mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Apps
            </CardTitle>
            <CardDescription>
              Enter an app name to search across iOS and Android stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectedAppSearchInput
              onAppSelect={handleAppSelect}
              placeholder="Search for an app (e.g., Instagram, Spotify, Notion...)"
              showPlatformToggle
              initialPlatformFilter="both"
              autoFocus
              noResultsMessage="No apps found. Try a different search term."
            />
          </CardContent>
        </Card>
      </section>

      {/* Selected App and Screenshots Section */}
      <section className="mx-auto max-w-5xl">
        {/* Selected App Details */}
        {selectedApp ? (
          <div className="space-y-6">
            <SelectedAppDetails
              app={selectedApp}
              isLoadingScreenshots={isLoadingScreenshots}
            />

            {/* Screenshot Error */}
            {screenshotError && (
              <Alert variant="destructive">
                <AlertDescription>{screenshotError}</AlertDescription>
              </Alert>
            )}

            {/* Screenshot Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Screenshots
                </CardTitle>
                <CardDescription>
                  Click on any screenshot to view it in full size
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScreenshotGallery
                  screenshots={screenshots}
                  isLoading={isLoadingScreenshots}
                  skeletonCount={6}
                  columns={4}
                  gap="md"
                  aspectRatio="auto"
                  showPlatformBadge
                  enableEnlargement
                  onScreenshotClick={handleScreenshotClick}
                  emptyMessage={
                    isLoadingScreenshots
                      ? "Loading screenshots..."
                      : "No screenshots available for this app"
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyAppState />
        )}
      </section>

      {/* How It Works Section */}
      <section className="mx-auto mt-16 max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          How It Works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  1
                </div>
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Search Apps</CardTitle>
              <CardDescription>
                Enter an app name to search across iOS App Store and Google Play Store simultaneously.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  2
                </div>
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Select App</CardTitle>
              <CardDescription>
                Choose an app from the search results to view its details and screenshots.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  3
                </div>
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">View Screenshots</CardTitle>
              <CardDescription>
                Browse through the app&apos;s screenshots. Click any image to enlarge and navigate.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  )
}
