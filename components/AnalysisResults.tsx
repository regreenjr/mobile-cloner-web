"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Download, Save, Palette, List, Layout, GitBranch, Star, Sparkles, Zap, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import type {
  AppAnalysis,
  UIPattern,
  UserFlow,
  FeatureSet,
  ColorPalette,
  AnalysisTypography,
  ScreenAnalysis,
} from "@/types/analyze"

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the main AnalysisResults component
 */
export interface AnalysisResultsProps {
  /** The analysis data to display */
  analysis: AppAnalysis | null
  /** Whether the data is currently loading */
  isLoading?: boolean
  /** Error message if the fetch failed */
  error?: string | null
  /** Callback to retry fetching data */
  onRetry?: () => void
  /** Callback when export to markdown is clicked */
  onExportMarkdown?: () => void
  /** Callback when save to database is clicked */
  onSave?: () => void
  /** Whether the save operation is in progress */
  isSaving?: boolean
  /** Additional class names for the container */
  className?: string
  /** The name of the app being analyzed (for display purposes) */
  appName?: string
}

/**
 * Props for the DesignPatternsSection sub-component
 */
export interface DesignPatternsSectionProps {
  /** Color palette extracted from the app */
  colorPalette: ColorPalette
  /** Typography information extracted from the app */
  typography: AnalysisTypography
  /** Overall style description */
  overallStyle: string
  /** Additional class names */
  className?: string
}

/**
 * Props for the FeatureListSection sub-component
 */
export interface FeatureListSectionProps {
  /** Feature set with categorized features */
  featureSet: FeatureSet
  /** Additional class names */
  className?: string
}

/**
 * Props for the UIPatternsSection sub-component
 */
export interface UIPatternsSectionProps {
  /** Array of UI patterns identified in the app */
  patterns: UIPattern[]
  /** Additional class names */
  className?: string
}

/**
 * Props for the UserFlowSection sub-component
 */
export interface UserFlowSectionProps {
  /** Array of user flows identified in the app */
  flows: UserFlow[]
  /** Additional class names */
  className?: string
}

/**
 * Props for individual color swatch display
 */
export interface ColorSwatchProps {
  /** The color value (hex, rgb, etc.) */
  color: string
  /** Label for the color */
  label: string
  /** Additional class names */
  className?: string
}

/**
 * Props for typography display
 */
export interface TypographyDisplayProps {
  /** Typography data */
  typography: AnalysisTypography
  /** Additional class names */
  className?: string
}

/**
 * Props for a single feature badge
 */
export interface FeatureBadgeProps {
  /** Feature name */
  feature: string
  /** Priority category */
  priority: "core" | "nice-to-have" | "differentiator"
  /** Additional class names */
  className?: string
}

/**
 * Props for a UI pattern card
 */
export interface PatternCardProps {
  /** The UI pattern data */
  pattern: UIPattern
  /** Additional class names */
  className?: string
}

/**
 * Props for a user flow card
 */
export interface FlowCardProps {
  /** The user flow data */
  flow: UserFlow
  /** Additional class names */
  className?: string
}

/**
 * Props for the empty state component
 */
export interface EmptyStateProps {
  /** Message to display */
  message: string
  /** Icon to display */
  icon?: React.ReactNode
  /** Additional class names */
  className?: string
}

/**
 * Tab identifiers for the analysis results tabs
 */
export type AnalysisTab = "design" | "features" | "patterns" | "flows" | "styleGuide"

/**
 * Props for tab configuration
 */
export interface TabConfig {
  /** Tab identifier */
  id: AnalysisTab
  /** Display label */
  label: string
  /** Icon component */
  icon: React.ReactNode
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Tab configuration for the analysis results
 */
export const ANALYSIS_TABS: TabConfig[] = [
  { id: "design", label: "Design Patterns", icon: <Palette className="h-4 w-4" /> },
  { id: "styleGuide", label: "Style Guide", icon: <Eye className="h-4 w-4" /> },
  { id: "features", label: "Features", icon: <List className="h-4 w-4" /> },
  { id: "patterns", label: "UI Patterns", icon: <Layout className="h-4 w-4" /> },
  { id: "flows", label: "User Flows", icon: <GitBranch className="h-4 w-4" /> },
]

/**
 * Color labels for the color palette display
 */
export const COLOR_LABELS: Record<keyof ColorPalette, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  surface: "Surface",
  text: "Text",
  textSecondary: "Text Secondary",
  success: "Success",
  warning: "Warning",
  error: "Error",
}

/**
 * Priority badge variants
 */
export const PRIORITY_VARIANTS = {
  core: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Core",
  },
  "nice-to-have": {
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    label: "Nice to Have",
  },
  differentiator: {
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    label: "Differentiator",
  },
} as const

/**
 * Complexity badge variants for user flows
 */
export const COMPLEXITY_VARIANTS = {
  simple: {
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    label: "Simple",
  },
  moderate: {
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    label: "Moderate",
  },
  complex: {
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    label: "Complex",
  },
} as const

/**
 * Frequency badge variants for UI patterns
 */
export const FREQUENCY_VARIANTS = {
  single_screen: {
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    label: "Single Screen",
  },
  multiple_screens: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Multiple Screens",
  },
  all_screens: {
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    label: "All Screens",
  },
} as const

// ============================================================================
// Markdown Export Utilities
// ============================================================================

/**
 * Escapes special markdown characters in a string
 * @param text - The text to escape
 * @returns The escaped text safe for markdown
 */
function escapeMarkdown(text: string): string {
  if (!text) return ""
  // Escape common markdown special characters
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\|/g, "\\|")
}

/**
 * Generates a markdown document from the analysis data
 * @param analysis - The app analysis data
 * @param appName - Optional name of the app being analyzed
 * @returns The formatted markdown string
 */
export function generateAnalysisMarkdown(
  analysis: AppAnalysis,
  appName?: string
): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${appName ? `${escapeMarkdown(appName)} - ` : ""}App Analysis Report`)
  lines.push("")
  lines.push(`**Generated:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`)
  lines.push(`**Analysis Date:** ${new Date(analysis.analyzedAt).toLocaleDateString()}`)
  lines.push(`**Screens Analyzed:** ${analysis.screensAnalyzed}`)
  lines.push("")
  lines.push("---")
  lines.push("")

  // Table of Contents
  lines.push("## Table of Contents")
  lines.push("")
  lines.push("1. [Design Patterns](#design-patterns)")
  lines.push("2. [Features](#features)")
  lines.push("3. [UI Patterns](#ui-patterns)")
  lines.push("4. [User Flows](#user-flows)")
  lines.push("5. [Screen Analysis](#screen-analysis)")
  lines.push("6. [Insights](#insights)")
  lines.push("")
  lines.push("---")
  lines.push("")

  // Design Patterns Section
  lines.push("## Design Patterns")
  lines.push("")

  // Overall Style
  if (analysis.overallStyle) {
    lines.push("### Overall Style")
    lines.push("")
    lines.push(escapeMarkdown(analysis.overallStyle))
    lines.push("")
  }

  // Color Palette
  if (analysis.colorPalette) {
    lines.push("### Color Palette")
    lines.push("")
    lines.push("| Role | Color |")
    lines.push("|------|-------|")

    const colorEntries: [string, string][] = [
      ["Primary", analysis.colorPalette.primary],
      ["Secondary", analysis.colorPalette.secondary],
      ["Accent", analysis.colorPalette.accent],
      ["Background", analysis.colorPalette.background],
      ["Surface", analysis.colorPalette.surface],
      ["Text", analysis.colorPalette.text],
      ["Text Secondary", analysis.colorPalette.textSecondary],
    ]

    // Add optional semantic colors
    if (analysis.colorPalette.success) {
      colorEntries.push(["Success", analysis.colorPalette.success])
    }
    if (analysis.colorPalette.warning) {
      colorEntries.push(["Warning", analysis.colorPalette.warning])
    }
    if (analysis.colorPalette.error) {
      colorEntries.push(["Error", analysis.colorPalette.error])
    }

    for (const [role, color] of colorEntries) {
      if (color) {
        lines.push(`| ${role} | \`${escapeMarkdown(color)}\` |`)
      }
    }
    lines.push("")
  }

  // Typography
  if (analysis.typography) {
    lines.push("### Typography")
    lines.push("")
    lines.push("**Heading Font**")
    lines.push(`- Family: ${escapeMarkdown(analysis.typography.headingFont)}`)
    lines.push(`- Size: ${escapeMarkdown(analysis.typography.headingSize)}`)
    lines.push(`- Weight: ${escapeMarkdown(analysis.typography.headingWeight)}`)
    lines.push("")
    lines.push("**Body Font**")
    lines.push(`- Family: ${escapeMarkdown(analysis.typography.bodyFont)}`)
    lines.push(`- Size: ${escapeMarkdown(analysis.typography.bodySize)}`)
    lines.push(`- Weight: ${escapeMarkdown(analysis.typography.bodyWeight)}`)
    if (analysis.typography.captionFont) {
      lines.push("")
      lines.push("**Caption Font**")
      lines.push(`- Family: ${escapeMarkdown(analysis.typography.captionFont)}`)
      if (analysis.typography.captionSize) {
        lines.push(`- Size: ${escapeMarkdown(analysis.typography.captionSize)}`)
      }
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  // Features Section
  lines.push("## Features")
  lines.push("")

  if (analysis.featureSet) {
    const totalFeatures =
      (analysis.featureSet.core?.length || 0) +
      (analysis.featureSet.niceToHave?.length || 0) +
      (analysis.featureSet.differentiators?.length || 0)

    lines.push(`*${totalFeatures} features identified*`)
    lines.push("")

    if (analysis.featureSet.core && analysis.featureSet.core.length > 0) {
      lines.push("### Core Features")
      lines.push("")
      lines.push("Essential functionality that defines the app.")
      lines.push("")
      for (const feature of analysis.featureSet.core) {
        lines.push(`- ${escapeMarkdown(feature)}`)
      }
      lines.push("")
    }

    if (analysis.featureSet.niceToHave && analysis.featureSet.niceToHave.length > 0) {
      lines.push("### Nice to Have Features")
      lines.push("")
      lines.push("Features that enhance user experience.")
      lines.push("")
      for (const feature of analysis.featureSet.niceToHave) {
        lines.push(`- ${escapeMarkdown(feature)}`)
      }
      lines.push("")
    }

    if (analysis.featureSet.differentiators && analysis.featureSet.differentiators.length > 0) {
      lines.push("### Differentiators")
      lines.push("")
      lines.push("Unique features that set this app apart.")
      lines.push("")
      for (const feature of analysis.featureSet.differentiators) {
        lines.push(`- ${escapeMarkdown(feature)}`)
      }
      lines.push("")
    }
  } else {
    lines.push("*No feature data available*")
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  // UI Patterns Section
  lines.push("## UI Patterns")
  lines.push("")

  if (analysis.designPatterns && analysis.designPatterns.length > 0) {
    lines.push(`*${analysis.designPatterns.length} patterns identified*`)
    lines.push("")

    for (const pattern of analysis.designPatterns) {
      lines.push(`### ${escapeMarkdown(pattern.name)}`)
      lines.push("")
      if (pattern.description) {
        lines.push(escapeMarkdown(pattern.description))
        lines.push("")
      }
      lines.push(`**Frequency:** ${FREQUENCY_VARIANTS[pattern.frequency]?.label || pattern.frequency}`)
      lines.push("")
      if (pattern.components && pattern.components.length > 0) {
        lines.push(`**Components:** ${pattern.components.map(escapeMarkdown).join(", ")}`)
        lines.push("")
      }
      if (pattern.screenshotIndices && pattern.screenshotIndices.length > 0) {
        lines.push(`**Found in screens:** ${pattern.screenshotIndices.map((i) => i + 1).join(", ")}`)
        lines.push("")
      }
    }
  } else {
    lines.push("*No UI patterns identified*")
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  // User Flows Section
  lines.push("## User Flows")
  lines.push("")

  if (analysis.userFlows && analysis.userFlows.length > 0) {
    const totalSteps = analysis.userFlows.reduce((sum, flow) => sum + flow.stepCount, 0)
    lines.push(`*${analysis.userFlows.length} flows identified with ${totalSteps} total steps*`)
    lines.push("")

    for (const flow of analysis.userFlows) {
      lines.push(`### ${escapeMarkdown(flow.name)}`)
      lines.push("")
      if (flow.description) {
        lines.push(escapeMarkdown(flow.description))
        lines.push("")
      }
      lines.push(`**Complexity:** ${COMPLEXITY_VARIANTS[flow.complexity]?.label || flow.complexity}`)
      lines.push(`**Steps:** ${flow.stepCount}`)
      lines.push("")
      if (flow.screens && flow.screens.length > 0) {
        lines.push("**Flow Path:**")
        lines.push("")
        lines.push(flow.screens.map(escapeMarkdown).join(" → "))
        lines.push("")
      }
      if (flow.screenshotIndices && flow.screenshotIndices.length > 0) {
        lines.push(`**Related screens:** ${flow.screenshotIndices.map((i) => i + 1).join(", ")}`)
        lines.push("")
      }
    }
  } else {
    lines.push("*No user flows identified*")
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  // Screen Analysis Section
  lines.push("## Screen Analysis")
  lines.push("")

  if (analysis.screens && analysis.screens.length > 0) {
    for (const screen of analysis.screens) {
      lines.push(`### Screen ${screen.index + 1}: ${escapeMarkdown(screen.screenName)}`)
      lines.push("")
      lines.push(`**Type:** ${escapeMarkdown(screen.screenType)}`)
      lines.push("")
      if (screen.components && screen.components.length > 0) {
        lines.push(`**Components:** ${screen.components.map(escapeMarkdown).join(", ")}`)
        lines.push("")
      }
      if (screen.patterns && screen.patterns.length > 0) {
        lines.push(`**Patterns:** ${screen.patterns.map(escapeMarkdown).join(", ")}`)
        lines.push("")
      }
      if (screen.navigation && screen.navigation.length > 0) {
        lines.push(`**Navigation:** ${screen.navigation.map(escapeMarkdown).join(", ")}`)
        lines.push("")
      }
      if (screen.interactions && screen.interactions.length > 0) {
        lines.push(`**Interactions:** ${screen.interactions.map(escapeMarkdown).join(", ")}`)
        lines.push("")
      }
      if (screen.notes) {
        lines.push(`**Notes:** ${escapeMarkdown(screen.notes)}`)
        lines.push("")
      }
    }
  } else {
    lines.push("*No individual screen analysis available*")
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  // Insights Section
  lines.push("## Insights")
  lines.push("")

  if (analysis.targetAudience) {
    lines.push("### Target Audience")
    lines.push("")
    lines.push(escapeMarkdown(analysis.targetAudience))
    lines.push("")
  }

  if (analysis.uniqueSellingPoints && analysis.uniqueSellingPoints.length > 0) {
    lines.push("### Unique Selling Points")
    lines.push("")
    for (const usp of analysis.uniqueSellingPoints) {
      lines.push(`- ${escapeMarkdown(usp)}`)
    }
    lines.push("")
  }

  if (analysis.improvementOpportunities && analysis.improvementOpportunities.length > 0) {
    lines.push("### Improvement Opportunities")
    lines.push("")
    for (const opportunity of analysis.improvementOpportunities) {
      lines.push(`- ${escapeMarkdown(opportunity)}`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push("*Report generated by Mobile Cloner - AI-powered app analysis*")

  return lines.join("\n")
}

/**
 * Triggers a browser download of the markdown content
 * @param content - The markdown content to download
 * @param filename - The filename for the download (without extension)
 */
function downloadMarkdownFile(content: string, filename: string): void {
  // Create a Blob with the markdown content
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary anchor element to trigger the download
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.md`

  // Append to body, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}

/**
 * Generates a safe filename from the app name
 * @param appName - The app name to convert to a filename
 * @returns A sanitized filename
 */
function generateFilename(appName?: string): string {
  const baseName = appName || "app-analysis"
  const date = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

  // Sanitize the app name: replace spaces with hyphens, remove special characters
  const safeName = baseName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .substring(0, 50) // Limit length

  return `${safeName}-analysis-${date}`
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Empty state component for sections with no data
 */
function EmptyState({ message, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 transition-colors",
        className
      )}
    >
      {icon && <div className="mb-3 text-muted-foreground/60">{icon}</div>}
      <p className="text-center text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}

/**
 * Skeleton for color swatch display
 */
function ColorSwatchSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

/**
 * Skeleton for the Design Patterns section
 * Matches the structure of DesignPatternsSection with color swatches and typography
 */
function DesignPatternsSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overall Style Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>

      {/* Color Palette Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Brand Colors */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ColorSwatchSkeleton />
                <ColorSwatchSkeleton />
                <ColorSwatchSkeleton />
              </div>
            </div>
            {/* Background & Surface */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ColorSwatchSkeleton />
                <ColorSwatchSkeleton />
              </div>
            </div>
            {/* Text Colors */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ColorSwatchSkeleton />
                <ColorSwatchSkeleton />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heading Font */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
            {/* Body Font */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton for a feature category card
 */
function FeatureCategoryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton for the Feature List section
 * Matches the structure of FeatureListSection with summary and category cards
 */
function FeatureListSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Category Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCategoryCardSkeleton />
        <FeatureCategoryCardSkeleton />
        <FeatureCategoryCardSkeleton />
      </div>
    </div>
  )
}

/**
 * Skeleton for a single UI pattern card
 */
function PatternCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Components */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-16 rounded-full" />
            ))}
          </div>
        </div>
        {/* Screen references */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton for the UI Patterns section
 * Matches the structure of UIPatternsSection with summary and pattern cards
 */
function UIPatternsSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </div>
          {/* All Components Used */}
          <div className="mt-4 pt-4 border-t">
            <Skeleton className="h-3 w-32 mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PatternCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for a single user flow card
 */
function FlowCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step count indicator */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        {/* Flow Path */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <React.Fragment key={i}>
                <Skeleton className="h-6 w-20 rounded-md" />
                {i < 2 && <Skeleton className="h-3 w-3" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Related Screens */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton for the User Flows section
 * Matches the structure of UserFlowSection with summary and flow cards
 */
function UserFlowSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </div>
          {/* All Screens in Flows */}
          <div className="mt-4 pt-4 border-t">
            <Skeleton className="h-3 w-32 mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flow Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <FlowCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Loading skeleton for the entire analysis results
 * Provides a full page skeleton that matches the actual component structure
 */
function AnalysisResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>

      {/* Default to Design Patterns section skeleton */}
      <DesignPatternsSectionSkeleton />
    </div>
  )
}

/**
 * Props for section-specific loading skeleton
 */
export interface SectionSkeletonProps {
  /** The section to show skeleton for */
  section?: AnalysisTab
  /** Additional class names */
  className?: string
}

/**
 * Renders section-specific skeleton based on the active tab
 * Use this when you want to show loading for a specific section
 */
function SectionSkeleton({ section = "design", className }: SectionSkeletonProps) {
  const skeletonMap: Record<AnalysisTab, React.ReactNode> = {
    design: <DesignPatternsSectionSkeleton />,
    styleGuide: <DesignPatternsSectionSkeleton />,
    features: <FeatureListSectionSkeleton />,
    patterns: <UIPatternsSectionSkeleton />,
    flows: <UserFlowSectionSkeleton />,
  }

  return <div className={className}>{skeletonMap[section]}</div>
}

/**
 * Error state component with retry button
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive" className="shadow-sm">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="font-semibold">Error Loading Analysis</AlertTitle>
      <AlertDescription className="flex flex-col gap-4 mt-2">
        <span className="text-sm">{error}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit shadow-sm transition-all hover:shadow-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * ColorSwatch - Displays a single color with label and hex value
 */
function ColorSwatch({ color, label, className }: ColorSwatchProps) {
  const isValidColor = color && color !== "unknown" && color !== ""

  return (
    <div className={cn("group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50", className)}>
      <div
        className={cn(
          "h-12 w-12 rounded-lg border-2 shadow-sm flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10 transition-transform group-hover:scale-105",
          !isValidColor && "bg-muted border-dashed"
        )}
        style={isValidColor ? { backgroundColor: color } : undefined}
        title={isValidColor ? color : "Not detected"}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs text-muted-foreground font-mono truncate select-all">
          {isValidColor ? color : "—"}
        </p>
      </div>
    </div>
  )
}

/**
 * TypographyDisplay - Displays typography information in a structured format
 */
function TypographyDisplay({ typography, className }: TypographyDisplayProps) {
  if (!typography) {
    return (
      <EmptyState
        message="No typography information available"
        className={className}
      />
    )
  }

  const typographyItems = [
    {
      label: "Heading Font",
      value: typography.headingFont,
      details: `${typography.headingSize} • ${typography.headingWeight}`,
    },
    {
      label: "Body Font",
      value: typography.bodyFont,
      details: `${typography.bodySize} • ${typography.bodyWeight}`,
    },
  ]

  // Add caption font if available
  if (typography.captionFont) {
    typographyItems.push({
      label: "Caption Font",
      value: typography.captionFont,
      details: typography.captionSize || "",
    })
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {typographyItems.map((item) => (
        <div
          key={item.label}
          className="space-y-2 rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {item.label}
          </p>
          <p className="text-lg font-semibold leading-tight" style={{ fontFamily: item.value }}>
            {item.value || "Not detected"}
          </p>
          {item.details && (
            <p className="text-sm text-muted-foreground">{item.details}</p>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * LiveTypographyPreview - Shows actual rendered text samples using extracted fonts
 */
function LiveTypographyPreview({
  typography,
  colorPalette,
  className
}: {
  typography: AnalysisTypography
  colorPalette: ColorPalette
  className?: string
}) {
  if (!typography) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Heading Sample */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Heading Style
        </p>
        <div
          className="rounded-lg border bg-card p-6"
          style={{
            fontFamily: typography.headingFont,
            fontSize: typography.headingSize,
            fontWeight: typography.headingWeight,
            color: colorPalette.text
          }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
        <p className="text-xs text-muted-foreground">
          {typography.headingFont} · {typography.headingSize} · {typography.headingWeight}
        </p>
      </div>

      {/* Body Sample */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Body Style
        </p>
        <div
          className="rounded-lg border bg-card p-6"
          style={{
            fontFamily: typography.bodyFont,
            fontSize: typography.bodySize,
            fontWeight: typography.bodyWeight,
            color: colorPalette.text
          }}
        >
          The quick brown fox jumps over the lazy dog. This is how body text appears in the application with proper sizing and weight.
        </div>
        <p className="text-xs text-muted-foreground">
          {typography.bodyFont} · {typography.bodySize} · {typography.bodyWeight}
        </p>
      </div>

      {/* Caption Sample (if available) */}
      {typography.captionFont && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Caption Style
          </p>
          <div
            className="rounded-lg border bg-card p-6"
            style={{
              fontFamily: typography.captionFont,
              fontSize: typography.captionSize,
              color: colorPalette.textSecondary
            }}
          >
            Caption text style with smaller sizing
          </div>
          <p className="text-xs text-muted-foreground">
            {typography.captionFont} · {typography.captionSize}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * ColorCombinationGrid - Shows how colors work together
 */
function ColorCombinationGrid({
  colorPalette,
  typography,
  className
}: {
  colorPalette: ColorPalette
  typography: AnalysisTypography
  className?: string
}) {
  const combinations = [
    {
      label: "Primary on Background",
      bg: colorPalette.background,
      text: colorPalette.primary,
      sample: "Primary Text"
    },
    {
      label: "Text on Background",
      bg: colorPalette.background,
      text: colorPalette.text,
      sample: "Body Text"
    },
    {
      label: "Text on Surface",
      bg: colorPalette.surface,
      text: colorPalette.text,
      sample: "Surface Text"
    },
    {
      label: "Primary on Surface",
      bg: colorPalette.surface,
      text: colorPalette.primary,
      sample: "Primary on Card"
    },
    {
      label: "Accent on Background",
      bg: colorPalette.background,
      text: colorPalette.accent,
      sample: "Accent Text"
    },
    {
      label: "Secondary Text",
      bg: colorPalette.background,
      text: colorPalette.textSecondary,
      sample: "Subtitle Text"
    },
  ]

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {combinations.map((combo, idx) => (
        <div key={idx} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {combo.label}
          </p>
          <div
            className="rounded-lg border p-6 transition-transform hover:scale-105"
            style={{
              backgroundColor: combo.bg,
              color: combo.text,
              fontFamily: typography.bodyFont
            }}
          >
            <p className="font-semibold">{combo.sample}</p>
            <p className="text-sm mt-2 opacity-80">Sample text content</p>
          </div>
          <div className="flex gap-2 text-xs font-mono">
            <span className="text-muted-foreground">BG:</span>
            <span>{combo.bg}</span>
            <span className="text-muted-foreground">Text:</span>
            <span>{combo.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * ComponentShowcase - Shows styled UI components using the design system
 */
function ComponentShowcase({
  colorPalette,
  typography,
  className
}: {
  colorPalette: ColorPalette
  typography: AnalysisTypography
  className?: string
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Buttons */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Button Styles</h4>
        <div className="flex flex-wrap gap-3">
          {/* Primary Button */}
          <button
            className="px-6 py-2.5 rounded-lg font-medium transition-transform hover:scale-105 shadow-sm"
            style={{
              backgroundColor: colorPalette.primary,
              color: colorPalette.background,
              fontFamily: typography.bodyFont,
            }}
          >
            Primary Button
          </button>

          {/* Secondary Button */}
          <button
            className="px-6 py-2.5 rounded-lg font-medium transition-transform hover:scale-105 shadow-sm"
            style={{
              backgroundColor: colorPalette.secondary,
              color: colorPalette.background,
              fontFamily: typography.bodyFont,
            }}
          >
            Secondary Button
          </button>

          {/* Accent Button */}
          <button
            className="px-6 py-2.5 rounded-lg font-medium transition-transform hover:scale-105 shadow-sm"
            style={{
              backgroundColor: colorPalette.accent,
              color: colorPalette.background,
              fontFamily: typography.bodyFont,
            }}
          >
            Accent Button
          </button>

          {/* Outline Button */}
          <button
            className="px-6 py-2.5 rounded-lg font-medium transition-transform hover:scale-105 border-2"
            style={{
              backgroundColor: 'transparent',
              borderColor: colorPalette.primary,
              color: colorPalette.primary,
              fontFamily: typography.bodyFont,
            }}
          >
            Outline Button
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Card Examples</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Standard Card */}
          <div
            className="rounded-xl p-6 shadow-md border"
            style={{
              backgroundColor: colorPalette.surface,
              borderColor: colorPalette.primary + '20',
            }}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{
                color: colorPalette.text,
                fontFamily: typography.headingFont,
              }}
            >
              Card Title
            </h3>
            <p
              className="mb-4"
              style={{
                color: colorPalette.textSecondary,
                fontFamily: typography.bodyFont,
                fontSize: typography.bodySize,
              }}
            >
              This is a sample card using the extracted design system colors and typography.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: colorPalette.primary,
                color: colorPalette.background,
                fontFamily: typography.bodyFont,
              }}
            >
              Learn More
            </button>
          </div>

          {/* Accent Card */}
          <div
            className="rounded-xl p-6 shadow-md border-2"
            style={{
              backgroundColor: colorPalette.accent + '10',
              borderColor: colorPalette.accent,
            }}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{
                color: colorPalette.accent,
                fontFamily: typography.headingFont,
              }}
            >
              Featured Card
            </h3>
            <p
              className="mb-4"
              style={{
                color: colorPalette.text,
                fontFamily: typography.bodyFont,
                fontSize: typography.bodySize,
              }}
            >
              An accent-colored card variant to highlight important content.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: colorPalette.accent,
                color: colorPalette.background,
                fontFamily: typography.bodyFont,
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Input Examples</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{
                color: colorPalette.text,
                fontFamily: typography.bodyFont,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition-colors focus:scale-[1.01]"
              style={{
                backgroundColor: colorPalette.background,
                borderColor: colorPalette.primary + '40',
                color: colorPalette.text,
                fontFamily: typography.bodyFont,
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{
                color: colorPalette.text,
                fontFamily: typography.bodyFont,
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition-colors focus:scale-[1.01]"
              style={{
                backgroundColor: colorPalette.background,
                borderColor: colorPalette.primary + '40',
                color: colorPalette.text,
                fontFamily: typography.bodyFont,
              }}
            />
          </div>
        </div>
      </div>

      {/* Badges/Tags */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Badge Styles</h4>
        <div className="flex flex-wrap gap-2">
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: colorPalette.primary + '20',
              color: colorPalette.primary,
              fontFamily: typography.bodyFont,
            }}
          >
            Primary Badge
          </span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: colorPalette.secondary + '20',
              color: colorPalette.secondary,
              fontFamily: typography.bodyFont,
            }}
          >
            Secondary Badge
          </span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: colorPalette.accent + '20',
              color: colorPalette.accent,
              fontFamily: typography.bodyFont,
            }}
          >
            Accent Badge
          </span>
          {colorPalette.success && (
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: colorPalette.success + '20',
                color: colorPalette.success,
                fontFamily: typography.bodyFont,
              }}
            >
              Success
            </span>
          )}
          {colorPalette.warning && (
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: colorPalette.warning + '20',
                color: colorPalette.warning,
                fontFamily: typography.bodyFont,
              }}
            >
              Warning
            </span>
          )}
          {colorPalette.error && (
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: colorPalette.error + '20',
                color: colorPalette.error,
                fontFamily: typography.bodyFont,
              }}
            >
              Error
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * LivingStyleGuideSection - Complete visual preview of the design system
 */
function LivingStyleGuideSection({
  colorPalette,
  typography,
  overallStyle,
  className,
}: {
  colorPalette: ColorPalette
  typography: AnalysisTypography
  overallStyle: string
  className?: string
}) {
  if (!colorPalette || !typography) {
    return (
      <div className={cn("space-y-6", className)}>
        <EmptyState
          message="Insufficient data to generate style guide"
          icon={<Eye className="h-8 w-8" />}
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Overview */}
      {overallStyle && (
        <Card className="bg-gradient-to-br from-card to-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Living Style Guide
            </CardTitle>
            <CardDescription>
              Visual preview of the extracted design system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-sm">{overallStyle}</p>
          </CardContent>
        </Card>
      )}

      {/* Typography Samples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Typography in Action</CardTitle>
          <CardDescription>
            See how the fonts render at actual sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiveTypographyPreview
            typography={typography}
            colorPalette={colorPalette}
          />
        </CardContent>
      </Card>

      {/* Color Combinations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Color Combinations</CardTitle>
          <CardDescription>
            How colors work together in context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ColorCombinationGrid
            colorPalette={colorPalette}
            typography={typography}
          />
        </CardContent>
      </Card>

      {/* Component Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Component Preview</CardTitle>
          <CardDescription>
            UI components styled with the extracted design system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComponentShowcase
            colorPalette={colorPalette}
            typography={typography}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * FeatureBadge - Displays a single feature with priority-based styling
 */
function FeatureBadge({ feature, priority, className }: FeatureBadgeProps) {
  const variant = PRIORITY_VARIANTS[priority]

  return (
    <Badge
      variant="outline"
      className={cn(
        variant.className,
        "font-medium py-1 px-2.5 text-xs shadow-sm transition-all hover:scale-105",
        className
      )}
    >
      {feature}
    </Badge>
  )
}

/**
 * FeatureCategoryCard - Displays a category of features with icon and badge list
 */
function FeatureCategoryCard({
  title,
  description,
  icon,
  features,
  priority,
  emptyMessage,
  className,
}: {
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  priority: "core" | "nice-to-have" | "differentiator"
  emptyMessage: string
  className?: string
}) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shadow-sm">
            {icon}
          </div>
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {features.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <FeatureBadge
                key={`${feature}-${index}`}
                feature={feature}
                priority={priority}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * FeatureListSection - Displays categorized features (core, nice-to-have, differentiators)
 *
 * Features:
 * - Three feature categories displayed in separate cards
 * - Color-coded badges for each priority level
 * - Icons to distinguish categories
 * - Empty state handling for categories with no features
 * - Feature count summary
 */
function FeatureListSection({ featureSet, className }: FeatureListSectionProps) {
  // Handle missing or null feature set
  if (!featureSet) {
    return (
      <div className={cn("space-y-6", className)}>
        <EmptyState
          message="No feature data available for this analysis"
          icon={<List className="h-8 w-8" />}
        />
      </div>
    )
  }

  const coreFeatures = featureSet.core || []
  const niceToHaveFeatures = featureSet.niceToHave || []
  const differentiatorFeatures = featureSet.differentiators || []

  const totalFeatures = coreFeatures.length + niceToHaveFeatures.length + differentiatorFeatures.length

  // If all categories are empty, show overall empty state
  if (totalFeatures === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <EmptyState
          message="No features have been identified in this analysis"
          icon={<List className="h-8 w-8" />}
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Feature Summary</CardTitle>
          <CardDescription>
            {totalFeatures} features identified across {
              [coreFeatures.length > 0, niceToHaveFeatures.length > 0, differentiatorFeatures.length > 0]
                .filter(Boolean).length
            } categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2.5">
              <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-blue-500")} />
              <span className="text-muted-foreground">Core:</span>
              <span className="font-semibold text-foreground">{coreFeatures.length}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-green-500")} />
              <span className="text-muted-foreground">Nice to Have:</span>
              <span className="font-semibold text-foreground">{niceToHaveFeatures.length}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-purple-500")} />
              <span className="text-muted-foreground">Differentiators:</span>
              <span className="font-semibold text-foreground">{differentiatorFeatures.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Category Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Core Features */}
        <FeatureCategoryCard
          title="Core Features"
          description="Essential functionality"
          icon={<Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          features={coreFeatures}
          priority="core"
          emptyMessage="No core features identified"
        />

        {/* Nice to Have Features */}
        <FeatureCategoryCard
          title="Nice to Have"
          description="Enhances user experience"
          icon={<Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />}
          features={niceToHaveFeatures}
          priority="nice-to-have"
          emptyMessage="No nice-to-have features identified"
        />

        {/* Differentiators */}
        <FeatureCategoryCard
          title="Differentiators"
          description="Unique competitive advantages"
          icon={<Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
          features={differentiatorFeatures}
          priority="differentiator"
          emptyMessage="No differentiators identified"
        />
      </div>
    </div>
  )
}

/**
 * DesignPatternsSection - Displays color palette, typography, and overall style
 *
 * Features:
 * - Color swatches with hex values for the full color palette
 * - Typography information with font families and sizes
 * - Overall style description
 * - Empty states for missing data
 */
function DesignPatternsSection({
  colorPalette,
  typography,
  overallStyle,
  className,
}: DesignPatternsSectionProps) {
  // Prepare color entries from the palette
  const colorEntries = colorPalette
    ? (Object.entries(COLOR_LABELS) as [keyof typeof COLOR_LABELS, string][])
        .filter(([key]) => key in colorPalette)
        .map(([key, label]) => ({
          key,
          label,
          color: colorPalette[key as keyof typeof colorPalette] || "",
        }))
    : []

  // Group colors by category for better organization
  const primaryColors = colorEntries.filter((c) =>
    ["primary", "secondary", "accent"].includes(c.key)
  )
  const surfaceColors = colorEntries.filter((c) =>
    ["background", "surface"].includes(c.key)
  )
  const textColors = colorEntries.filter((c) =>
    ["text", "textSecondary"].includes(c.key)
  )
  const semanticColors = colorEntries.filter((c) =>
    ["success", "warning", "error"].includes(c.key)
  )

  return (
    <div className={cn("space-y-8", className)}>
      {/* Overall Style Description */}
      {overallStyle && (
        <Card className="bg-gradient-to-br from-card to-muted/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Overall Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-sm">{overallStyle}</p>
          </CardContent>
        </Card>
      )}

      {/* Color Palette Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Color Palette</CardTitle>
          <CardDescription>
            Colors extracted from the app&apos;s design
          </CardDescription>
        </CardHeader>
        <CardContent>
          {colorEntries.length > 0 ? (
            <div className="space-y-8">
              {/* Primary Colors */}
              {primaryColors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Brand Colors
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {primaryColors.map((item) => (
                      <ColorSwatch
                        key={item.key}
                        color={item.color}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Surface Colors */}
              {surfaceColors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Background & Surface
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {surfaceColors.map((item) => (
                      <ColorSwatch
                        key={item.key}
                        color={item.color}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Text Colors */}
              {textColors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Text Colors
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {textColors.map((item) => (
                      <ColorSwatch
                        key={item.key}
                        color={item.color}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Semantic Colors */}
              {semanticColors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Semantic Colors
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {semanticColors.map((item) => (
                      <ColorSwatch
                        key={item.key}
                        color={item.color}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              message="No color palette data available"
              icon={<Palette className="h-8 w-8" />}
            />
          )}
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Typography</CardTitle>
          <CardDescription>
            Font families and sizing used in the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typography ? (
            <TypographyDisplay typography={typography} />
          ) : (
            <EmptyState
              message="No typography data available"
              icon={<Palette className="h-8 w-8" />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Placeholder Sub-Components (to be implemented in subsequent tasks)
// ============================================================================

/**
 * Placeholder for FeatureListSection
 * Will be fully implemented in T003
 */
function FeatureListSectionPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        message="Feature list section will be implemented in T003"
        icon={<List className="h-8 w-8" />}
      />
    </div>
  )
}

/**
 * PatternCard - Displays a single UI pattern with its details
 *
 * Features:
 * - Pattern name and description
 * - Frequency badge (single screen, multiple screens, all screens)
 * - Component tags showing the UI components used
 * - Screenshot indices for reference
 */
function PatternCard({ pattern, className }: PatternCardProps) {
  const frequencyVariant = FREQUENCY_VARIANTS[pattern.frequency] || FREQUENCY_VARIANTS.single_screen

  return (
    <Card className={cn("h-full transition-all hover:shadow-md hover:border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-tight">
            {pattern.name}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs font-medium shadow-sm", frequencyVariant.className)}
          >
            {frequencyVariant.label}
          </Badge>
        </div>
        {pattern.description && (
          <CardDescription className="text-sm leading-relaxed mt-1">
            {pattern.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Components used in this pattern */}
        {pattern.components && pattern.components.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Components
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pattern.components.map((component, index) => (
                <Badge
                  key={`${component}-${index}`}
                  variant="secondary"
                  className="text-xs font-medium px-2 py-0.5"
                >
                  {component}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Screenshot references */}
        {pattern.screenshotIndices && pattern.screenshotIndices.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Found in Screens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pattern.screenshotIndices.map((index) => (
                <span
                  key={index}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  title={`Screen ${index + 1}`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * UIPatternsSection - Displays UI patterns identified in the app
 *
 * Features:
 * - Grid of pattern cards with responsive layout
 * - Frequency badge for each pattern (single screen, multiple screens, all screens)
 * - Component tags showing the UI components used in each pattern
 * - Screenshot indices for reference to original screens
 * - Summary card with pattern count and frequency breakdown
 * - Empty state handling when no patterns are found
 */
function UIPatternsSection({ patterns, className }: UIPatternsSectionProps) {
  // Handle missing or null patterns array
  if (!patterns || patterns.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <EmptyState
          message="No UI patterns have been identified in this analysis"
          icon={<Layout className="h-8 w-8" />}
        />
      </div>
    )
  }

  // Calculate frequency breakdown for summary
  const frequencyBreakdown = {
    single_screen: patterns.filter((p) => p.frequency === "single_screen").length,
    multiple_screens: patterns.filter((p) => p.frequency === "multiple_screens").length,
    all_screens: patterns.filter((p) => p.frequency === "all_screens").length,
  }

  // Get unique components across all patterns
  const allComponents = new Set<string>()
  patterns.forEach((pattern) => {
    pattern.components?.forEach((component) => allComponents.add(component))
  })

  return (
    <div className={cn("space-y-8", className)}>
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">UI Patterns Summary</CardTitle>
          <CardDescription>
            {patterns.length} pattern{patterns.length !== 1 ? "s" : ""} identified using {allComponents.size} unique component{allComponents.size !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            {/* Frequency breakdown */}
            {frequencyBreakdown.all_screens > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-purple-500")} />
                <span className="text-muted-foreground">Global:</span>
                <span className="font-semibold text-foreground">{frequencyBreakdown.all_screens}</span>
              </div>
            )}
            {frequencyBreakdown.multiple_screens > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-blue-500")} />
                <span className="text-muted-foreground">Multi-screen:</span>
                <span className="font-semibold text-foreground">{frequencyBreakdown.multiple_screens}</span>
              </div>
            )}
            {frequencyBreakdown.single_screen > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-gray-500")} />
                <span className="text-muted-foreground">Single-screen:</span>
                <span className="font-semibold text-foreground">{frequencyBreakdown.single_screen}</span>
              </div>
            )}
          </div>

          {/* All unique components */}
          {allComponents.size > 0 && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                All Components Used
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(allComponents)
                  .sort()
                  .map((component) => (
                    <Badge
                      key={component}
                      variant="outline"
                      className="text-xs font-medium px-2.5 py-0.5 transition-colors hover:bg-muted"
                    >
                      {component}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {patterns.map((pattern, index) => (
          <PatternCard
            key={`${pattern.name}-${index}`}
            pattern={pattern}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * FlowCard - Displays a single user flow with its details
 *
 * Features:
 * - Flow name and description
 * - Complexity badge (simple, moderate, complex)
 * - Step count indicator
 * - Screen names showing the flow path
 * - Screenshot indices for reference
 */
function FlowCard({ flow, className }: FlowCardProps) {
  const complexityVariant = COMPLEXITY_VARIANTS[flow.complexity] || COMPLEXITY_VARIANTS.simple

  return (
    <Card className={cn("h-full transition-all hover:shadow-md hover:border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-tight">
            {flow.name}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs font-medium shadow-sm", complexityVariant.className)}
          >
            {complexityVariant.label}
          </Badge>
        </div>
        {flow.description && (
          <CardDescription className="text-sm leading-relaxed mt-1">
            {flow.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step count indicator */}
        <div className="flex items-center gap-2.5 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shadow-sm">
            <span className="text-xs font-bold text-primary">{flow.stepCount}</span>
          </div>
          <span className="text-muted-foreground font-medium">
            step{flow.stepCount !== 1 ? "s" : ""} in this flow
          </span>
        </div>

        {/* Flow path - screens in order */}
        {flow.screens && flow.screens.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Flow Path
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {flow.screens.map((screen, index) => (
                <React.Fragment key={`${screen}-${index}`}>
                  <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium shadow-sm">
                    {screen}
                  </span>
                  {index < flow.screens.length - 1 && (
                    <span className="text-muted-foreground/70 text-sm font-medium">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Screenshot references */}
        {flow.screenshotIndices && flow.screenshotIndices.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Related Screens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {flow.screenshotIndices.map((index) => (
                <span
                  key={index}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  title={`Screen ${index + 1}`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * UserFlowSection - Displays user flows identified in the app
 *
 * Features:
 * - Grid of flow cards with responsive layout
 * - Complexity badge for each flow (simple, moderate, complex)
 * - Step count and flow path visualization
 * - Screenshot indices for reference to original screens
 * - Summary card with flow count and complexity breakdown
 * - Empty state handling when no flows are found
 */
function UserFlowSection({ flows, className }: UserFlowSectionProps) {
  // Handle missing or null flows array
  if (!flows || flows.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <EmptyState
          message="No user flows have been identified in this analysis"
          icon={<GitBranch className="h-8 w-8" />}
        />
      </div>
    )
  }

  // Calculate complexity breakdown for summary
  const complexityBreakdown = {
    simple: flows.filter((f) => f.complexity === "simple").length,
    moderate: flows.filter((f) => f.complexity === "moderate").length,
    complex: flows.filter((f) => f.complexity === "complex").length,
  }

  // Calculate total steps across all flows
  const totalSteps = flows.reduce((sum, flow) => sum + flow.stepCount, 0)

  // Get unique screens across all flows
  const allScreens = new Set<string>()
  flows.forEach((flow) => {
    flow.screens?.forEach((screen) => allScreens.add(screen))
  })

  return (
    <div className={cn("space-y-8", className)}>
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">User Flows Summary</CardTitle>
          <CardDescription>
            {flows.length} flow{flows.length !== 1 ? "s" : ""} identified with {totalSteps} total step{totalSteps !== 1 ? "s" : ""} across {allScreens.size} unique screen{allScreens.size !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            {/* Complexity breakdown */}
            {complexityBreakdown.simple > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-green-500")} />
                <span className="text-muted-foreground">Simple:</span>
                <span className="font-semibold text-foreground">{complexityBreakdown.simple}</span>
              </div>
            )}
            {complexityBreakdown.moderate > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-yellow-500")} />
                <span className="text-muted-foreground">Moderate:</span>
                <span className="font-semibold text-foreground">{complexityBreakdown.moderate}</span>
              </div>
            )}
            {complexityBreakdown.complex > 0 && (
              <div className="flex items-center gap-2.5">
                <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", "bg-red-500")} />
                <span className="text-muted-foreground">Complex:</span>
                <span className="font-semibold text-foreground">{complexityBreakdown.complex}</span>
              </div>
            )}
          </div>

          {/* All unique screens in flows */}
          {allScreens.size > 0 && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                All Screens in Flows
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(allScreens)
                  .sort()
                  .map((screen) => (
                    <Badge
                      key={screen}
                      variant="outline"
                      className="text-xs font-medium px-2.5 py-0.5 transition-colors hover:bg-muted"
                    >
                      {screen}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {flows.map((flow, index) => (
          <FlowCard
            key={`${flow.name}-${index}`}
            flow={flow}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AnalysisResults - Displays Claude AI analysis results in a tabbed interface
 *
 * Features:
 * - Tabbed interface for Design Patterns, Features, UI Patterns, and User Flows
 * - Loading state with skeleton placeholders
 * - Error state with retry button
 * - Export to Markdown functionality with file download
 * - Save to Supabase functionality
 *
 * @example
 * ```tsx
 * <AnalysisResults
 *   analysis={appAnalysis}
 *   isLoading={isLoading}
 *   error={error}
 *   onRetry={() => refetch()}
 *   onExportMarkdown={() => exportToMd()}
 *   onSave={() => saveToDb()}
 *   appName="My App"
 * />
 * ```
 */
export function AnalysisResults({
  analysis,
  isLoading = false,
  error = null,
  onRetry,
  onExportMarkdown,
  onSave,
  isSaving = false,
  className,
  appName,
}: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = React.useState<AnalysisTab>("design")

  /**
   * Default handler for exporting analysis as markdown
   * Generates a markdown document and triggers a file download
   */
  const handleExportMarkdown = React.useCallback(() => {
    if (!analysis) return

    // If a custom handler is provided, use it
    if (onExportMarkdown) {
      onExportMarkdown()
      return
    }

    // Generate the markdown content
    const markdownContent = generateAnalysisMarkdown(analysis, appName)

    // Generate a safe filename
    const filename = generateFilename(appName)

    // Trigger the download
    downloadMarkdownFile(markdownContent, filename)
  }, [analysis, appName, onExportMarkdown])

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <AnalysisResultsSkeleton />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    )
  }

  // Show empty state if no analysis data
  if (!analysis) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState
          message="No analysis data available. Please run an analysis first."
          icon={<AlertCircle className="h-8 w-8" />}
        />
      </div>
    )
  }

  return (
    <div className={cn("w-full space-y-8", className)}>
      {/* Header with app name and action buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {appName ? `Analysis: ${appName}` : "Analysis Results"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyzed {analysis.screensAnalyzed} screen{analysis.screensAnalyzed !== 1 ? "s" : ""} on{" "}
            {new Date(analysis.analyzedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            className="shadow-sm transition-all hover:shadow-md"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Markdown
          </Button>
          {onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="shadow-sm transition-all hover:shadow-md"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save to Database"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabbed interface */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AnalysisTab)}
        className="w-full"
      >
        <TabsList className="mb-2">
          {ANALYSIS_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Design Patterns Tab */}
        <TabsContent value="design" className="mt-6">
          <DesignPatternsSection
            colorPalette={analysis.colorPalette}
            typography={analysis.typography}
            overallStyle={analysis.overallStyle}
          />
        </TabsContent>

        {/* Style Guide Tab */}
        <TabsContent value="styleGuide" className="mt-6">
          <LivingStyleGuideSection
            colorPalette={analysis.colorPalette}
            typography={analysis.typography}
            overallStyle={analysis.overallStyle}
          />
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="mt-6">
          <FeatureListSection featureSet={analysis.featureSet} />
        </TabsContent>

        {/* UI Patterns Tab */}
        <TabsContent value="patterns" className="mt-6">
          <UIPatternsSection patterns={analysis.designPatterns} />
        </TabsContent>

        {/* User Flows Tab */}
        <TabsContent value="flows" className="mt-6">
          <UserFlowSection flows={analysis.userFlows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

// Export sub-components and helpers for reuse and testing
export {
  // Empty and error states
  EmptyState,
  ErrorState,
  // Skeleton loaders for loading states
  AnalysisResultsSkeleton,
  SectionSkeleton,
  ColorSwatchSkeleton,
  DesignPatternsSectionSkeleton,
  FeatureCategoryCardSkeleton,
  FeatureListSectionSkeleton,
  PatternCardSkeleton,
  UIPatternsSectionSkeleton,
  FlowCardSkeleton,
  UserFlowSectionSkeleton,
  // Design patterns section components
  ColorSwatch,
  TypographyDisplay,
  DesignPatternsSection,
  // Feature list section components
  FeatureBadge,
  FeatureCategoryCard,
  FeatureListSection,
  // UI patterns section components
  PatternCard,
  UIPatternsSection,
  // User flow section components
  FlowCard,
  UserFlowSection,
  // Legacy/placeholder components
  FeatureListSectionPlaceholder,
  // Markdown export utilities (generateAnalysisMarkdown is exported directly with `export function`)
  downloadMarkdownFile,
}
