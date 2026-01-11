"use client"

import * as React from "react"
import { Search, Sparkles, FileJson, ImageIcon, Loader2, Info, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
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
      <CardContent className="flex flex-col items-center justify-center min-h-[300px] py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Search className="h-10 w-10 text-primary/50" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Search for an App
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-[400px]">
          Enter an app name above to search iOS App Store and Google Play Store.
          Once selected, you can analyze its design patterns with AI.
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
        Search for any mobile app, select screenshots to analyze (up to 50), and let Gemini AI extract design patterns,
        colors, typography, spacing, and component styles. Powered by Google Gemini 2.0 Flash.
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Main Component
// ============================================================================

const steps = [
  {
    title: "Search App",
    description: "Enter an app name to search iOS and Android stores.",
    icon: Search,
  },
  {
    title: "AI Analysis",
    description: "Gemini examines screenshots to extract design elements.",
    icon: Sparkles,
  },
  {
    title: "Get Results",
    description: "Receive detailed specs: colors, typography, spacing, patterns.",
    icon: FileJson,
  },
]

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of screenshots that can be analyzed at once (Gemini limit) */
const MAX_SCREENSHOTS = 50

/**
 * AnalyzePage - Search for apps and analyze their design with Gemini AI
 *
 * Features:
 * - App search across iOS and Android stores
 * - Screenshot selection (up to 50 screenshots)
 * - Gemini 2.0 Flash AI analysis of design patterns
 * - Results saved to database
 */
export default function AnalyzePage() {
  const router = useRouter()

  // State for selected app and screenshots
  const [selectedApp, setSelectedApp] = React.useState<AppSearchResult | null>(null)
  const [screenshots, setScreenshots] = React.useState<AppStoreScreenshot[]>([])
  const [isLoadingScreenshots, setIsLoadingScreenshots] = React.useState(false)
  const [screenshotError, setScreenshotError] = React.useState<string | null>(null)

  // State for analysis
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)

  /**
   * Handle app selection from search results
   * Fetches full app details including screenshots if needed
   */
  const handleAppSelect = React.useCallback(async (app: AppSearchResult) => {
    setSelectedApp(app)
    setScreenshotError(null)
    setAnalysisError(null)

    // If app already has screenshots, use them directly
    if (app.screenshots && app.screenshots.length > 0) {
      // Only select the first MAX_SCREENSHOTS by default
      const limitedScreenshots = app.screenshots.map((s, index) => ({
        ...s,
        selected: index < MAX_SCREENSHOTS,
      }))
      setScreenshots(limitedScreenshots)
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
        // Only select the first MAX_SCREENSHOTS by default
        const screenshots = data.data.screenshots || []
        const limitedScreenshots = screenshots.map((s: AppStoreScreenshot, index: number) => ({
          ...s,
          selected: index < MAX_SCREENSHOTS,
        }))
        setScreenshots(limitedScreenshots)
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
   * Handle screenshot selection changes
   */
  const handleScreenshotToggle = React.useCallback(
    (screenshot: AppStoreScreenshot) => {
      setScreenshots((prev) =>
        prev.map((s) =>
          s.id === screenshot.id ? { ...s, selected: !s.selected } : s
        )
      )
    },
    []
  )

  /**
   * Analyze selected screenshots with Claude
   */
  const handleAnalyze = React.useCallback(async () => {
    if (!selectedApp || screenshots.length === 0) return

    // Get selected screenshots
    const selectedScreenshots = screenshots.filter((s) => s.selected)

    if (selectedScreenshots.length === 0) {
      setAnalysisError("Please select at least one screenshot to analyze")
      return
    }

    if (selectedScreenshots.length > MAX_SCREENSHOTS) {
      setAnalysisError(`Too many screenshots selected. Please select ${MAX_SCREENSHOTS} or fewer screenshots to avoid API size limits.`)
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      // Step 1: Create reference app in database to get UUID
      const createAppResponse = await fetch('/api/reference-apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedApp.name,
          category: selectedApp.category || 'Apps',
          app_store_url: selectedApp.platform === 'ios' ? selectedApp.storeUrl : null,
          play_store_url: selectedApp.platform === 'android' ? selectedApp.storeUrl : null,
          screenshots: selectedScreenshots.map((s, index) => ({
            id: s.id,
            url: s.url,
            platform: s.platform,
            deviceType: s.deviceType,
            order: index,
          })),
        }),
      })

      const appData = await createAppResponse.json()

      if (!appData.success || !appData.data?.id) {
        setAnalysisError(appData.error?.message || "Failed to create reference app.")
        return
      }

      const appId = appData.data.id

      // Step 2: Analyze screenshots with Claude using the app UUID
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: appId,
          appName: selectedApp.name,
          screenshots: selectedScreenshots.map((s, index) => ({
            id: s.id,
            url: s.url,
            order: index,
          })),
        }),
      })

      const analyzeData = await analyzeResponse.json()

      if (analyzeData.success) {
        // Redirect to analysis results page
        router.push(`/analyze/${appId}`)
      } else {
        setAnalysisError(analyzeData.error?.message || "Analysis failed. Please try again.")
      }
    } catch (error) {
      console.error("Error analyzing app:", error)
      setAnalysisError("Failed to analyze app. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [selectedApp, screenshots, router])

  // Count selected screenshots
  const selectedCount = screenshots.filter((s) => s.selected).length

  return (
    <div className="container py-12">
      {/* Page Header */}
      <section className="mx-auto max-w-3xl text-center mb-8">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Analyze Mobile App
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Search for any app and let Gemini AI extract colors, typography, spacing,
          and component patterns from screenshots.
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
              Search for App
            </CardTitle>
            <CardDescription>
              Enter an app name to search across iOS and Android stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectedAppSearchInput
              onAppSelect={handleAppSelect}
              placeholder="Search for an app (e.g., Headspace, Instagram, Notion...)"
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
        {selectedApp ? (
          <div className="space-y-6">
            {/* Selected App Details */}
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

            {/* Analysis Error */}
            {analysisError && (
              <Alert variant="destructive">
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}

            {/* Screenshot Gallery */}
            {screenshots.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Screenshots
                      </CardTitle>
                      <CardDescription>
                        Select screenshots to analyze ({selectedCount} selected, max {MAX_SCREENSHOTS})
                        {selectedCount > MAX_SCREENSHOTS && (
                          <span className="text-destructive ml-1">- Too many selected!</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || selectedCount === 0 || selectedCount > MAX_SCREENSHOTS}
                      size="lg"
                      className="gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
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
                    selectable
                    onScreenshotClick={handleScreenshotToggle}
                    emptyMessage={
                      isLoadingScreenshots
                        ? "Loading screenshots..."
                        : "No screenshots available for this app"
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <EmptyAppState />
        )}
      </section>

      {/* How It Works */}
      <section className="mx-auto mt-16 max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          How Analysis Works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <step.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
