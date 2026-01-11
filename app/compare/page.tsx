"use client"

import * as React from "react"
import {
  ArrowLeftRight,
  Download,
  Save,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AppSelector, useSelectedApps } from "@/components/AppSelector"
import { ComparisonTable, type ComparisonInsights } from "@/components/ComparisonTable"
import {
  buildComparisonData,
  downloadComparisonAsMarkdown,
  copyComparisonToClipboard,
  toAppComparison,
  validateAppsForComparison,
  type ComparisonData,
} from "@/lib/comparison"
import { appComparisons } from "@/lib/supabase/db"

// ============================================================================
// Types
// ============================================================================

type PageState = "selecting" | "comparing" | "generating-insights" | "complete"

interface SaveStatus {
  status: "idle" | "saving" | "saved" | "error"
  message?: string
}

interface InsightsStatus {
  error: string | null
  isRegenerating: boolean
}

// ============================================================================
// Page Component
// ============================================================================

export default function ComparePage() {
  // State for app selection
  const [selectedAppIds, setSelectedAppIds] = React.useState<string[]>([])

  // State for comparison
  const [pageState, setPageState] = React.useState<PageState>("selecting")
  const [comparisonData, setComparisonData] = React.useState<ComparisonData | null>(null)
  const [insights, setInsights] = React.useState<ComparisonInsights | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // State for save functionality
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>({ status: "idle" })
  const [isCopied, setIsCopied] = React.useState(false)

  // State for insights
  const [insightsStatus, setInsightsStatus] = React.useState<InsightsStatus>({
    error: null,
    isRegenerating: false,
  })

  // Get selected apps data
  const { selectedApps, isLoading: isLoadingApps } = useSelectedApps(selectedAppIds)

  // Check if we have enough apps selected
  const canCompare = selectedAppIds.length >= 2 && selectedAppIds.length <= 4
  const hasValidApps = selectedApps.length >= 2 && selectedApps.every((app) => app.analysis)

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Starts the comparison process
   */
  const handleStartComparison = React.useCallback(async () => {
    if (!hasValidApps) {
      const validation = validateAppsForComparison(selectedApps)
      if (!validation.isValid) {
        setError(validation.error ?? "Please select at least 2 analyzed apps")
        return
      }
    }

    setError(null)
    setInsightsStatus({ error: null, isRegenerating: false })
    setPageState("comparing")

    try {
      // Build comparison data from selected apps
      const data = buildComparisonData(selectedApps)
      setComparisonData(data)

      // Move to generating insights
      setPageState("generating-insights")

      // Generate AI insights via API
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appIds: selectedAppIds,
          options: {
            includeRecommendations: true,
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setInsights(result.data.insights)
        setInsightsStatus({ error: null, isRegenerating: false })
      } else {
        // If insights fail, we still show the comparison but note the error
        console.error("Failed to generate insights:", result.error)
        setInsightsStatus({
          error: result.error?.userMessage || result.error?.message || "Failed to generate insights",
          isRegenerating: false,
        })
      }

      setPageState("complete")
    } catch (err) {
      console.error("Comparison error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate comparison")
      setPageState("selecting")
    }
  }, [hasValidApps, selectedApps, selectedAppIds])

  /**
   * Regenerates AI insights via Claude API
   */
  const handleRegenerateInsights = React.useCallback(async () => {
    if (!comparisonData) return

    setInsightsStatus({ error: null, isRegenerating: true })
    setInsights(null)

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appIds: selectedAppIds,
          options: {
            includeRecommendations: true,
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setInsights(result.data.insights)
        setInsightsStatus({ error: null, isRegenerating: false })
      } else {
        console.error("Failed to regenerate insights:", result.error)
        setInsightsStatus({
          error: result.error?.userMessage || result.error?.message || "Failed to regenerate insights",
          isRegenerating: false,
        })
      }
    } catch (err) {
      console.error("Regenerate insights error:", err)
      setInsightsStatus({
        error: err instanceof Error ? err.message : "An error occurred while regenerating insights",
        isRegenerating: false,
      })
    }
  }, [comparisonData, selectedAppIds])

  /**
   * Saves the comparison to Supabase
   */
  const handleSaveComparison = React.useCallback(async () => {
    if (!comparisonData) return

    setSaveStatus({ status: "saving" })

    try {
      const appComparison = toAppComparison(comparisonData, insights)

      const result = await appComparisons.create({
        app_ids: selectedAppIds,
        comparison_data: appComparison,
      })

      if (result.success) {
        setSaveStatus({ status: "saved", message: "Comparison saved successfully!" })
        // Reset after showing success
        setTimeout(() => {
          setSaveStatus({ status: "idle" })
        }, 3000)
      } else {
        setSaveStatus({
          status: "error",
          message: (result as any).error.userMessage || "Failed to save comparison",
        })
      }
    } catch (err) {
      console.error("Save comparison error:", err)
      setSaveStatus({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to save comparison",
      })
    }
  }, [comparisonData, insights, selectedAppIds])

  /**
   * Downloads comparison as markdown
   */
  const handleDownload = React.useCallback(() => {
    if (!comparisonData) return
    downloadComparisonAsMarkdown(comparisonData, insights)
  }, [comparisonData, insights])

  /**
   * Copies comparison to clipboard
   */
  const handleCopy = React.useCallback(async () => {
    if (!comparisonData) return

    try {
      await copyComparisonToClipboard(comparisonData, insights)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Copy to clipboard error:", err)
    }
  }, [comparisonData, insights])

  /**
   * Resets the comparison to start fresh
   */
  const handleReset = React.useCallback(() => {
    setPageState("selecting")
    setComparisonData(null)
    setInsights(null)
    setError(null)
    setSaveStatus({ status: "idle" })
    setIsCopied(false)
    setInsightsStatus({ error: null, isRegenerating: false })
  }, [])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="container py-12">
      {/* Page Header */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Compare Mobile Apps
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Compare 2-4 analyzed mobile app designs side-by-side to understand their
          design patterns, color schemes, and UI differences.
        </p>
      </section>

      {/* App Selection */}
      <section className="mx-auto mt-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </span>
              Select Apps to Compare
            </CardTitle>
            <CardDescription>
              Choose 2-4 previously analyzed apps to compare. Apps must be analyzed
              before they can be compared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AppSelector
              selectedAppIds={selectedAppIds}
              onSelectionChange={setSelectedAppIds}
              minSelection={2}
              maxSelection={4}
              placeholder="Select apps to compare..."
              disabled={pageState !== "selecting"}
            />

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {pageState === "selecting" && (
                <Button
                  onClick={handleStartComparison}
                  disabled={!canCompare || isLoadingApps}
                  size="lg"
                >
                  {isLoadingApps ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Compare Apps
                    </>
                  )}
                </Button>
              )}

              {(pageState === "comparing" || pageState === "generating-insights") && (
                <Button disabled size="lg">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {pageState === "comparing" ? "Building comparison..." : "Generating insights..."}
                </Button>
              )}

              {pageState === "complete" && (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    New Comparison
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleRegenerateInsights}
                    disabled={pageState !== "complete"}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate Insights
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    disabled={!comparisonData}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Markdown
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!comparisonData}
                  >
                    {isCopied ? (
                      <>
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSaveComparison}
                    disabled={!comparisonData || saveStatus.status === "saving"}
                  >
                    {saveStatus.status === "saving" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveStatus.status === "saved" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Comparison
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Save Status Message */}
            {saveStatus.message && (
              <Alert variant={saveStatus.status === "error" ? "destructive" : "default"}>
                {saveStatus.status === "saved" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{saveStatus.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Comparison Results */}
      {(pageState === "comparing" || pageState === "generating-insights" || pageState === "complete") && (
        <section className="mx-auto mt-8 max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  2
                </span>
                Comparison Results
              </CardTitle>
              <CardDescription>
                Side-by-side comparison of features, design patterns, colors, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComparisonTable
                apps={selectedApps}
                isLoading={pageState === "comparing"}
                insights={insights}
                isGeneratingInsights={pageState === "generating-insights" || insightsStatus.isRegenerating}
                onRegenerateInsights={handleRegenerateInsights}
                isRegeneratingInsights={insightsStatus.isRegenerating}
                insightsError={insightsStatus.error}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* How It Works - Only show when not comparing */}
      {pageState === "selecting" && selectedAppIds.length === 0 && (
        <HowItWorksSection />
      )}
    </div>
  )
}

// ============================================================================
// How It Works Section
// ============================================================================

const steps = [
  {
    title: "Select Apps",
    description: "Choose 2-4 previously analyzed apps from your collection to compare.",
    icon: ArrowLeftRight,
  },
  {
    title: "AI Comparison",
    description: "Our AI analyzes both apps and identifies similarities and differences.",
    icon: Sparkles,
  },
  {
    title: "View & Export",
    description: "Get a detailed comparison report and export as markdown.",
    icon: Download,
  },
]

function HowItWorksSection() {
  return (
    <section className="mx-auto mt-16 max-w-4xl">
      <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
        How Comparison Works
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
  )
}
