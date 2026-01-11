"use client"

import * as React from "react"
import Image from "next/image"
import {
  Check,
  X,
  Palette,
  Type,
  Layout,
  GitBranch,
  Star,
  Sparkles,
  Zap,
  Smartphone,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  ArrowLeftRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { ReferenceAppRow } from "@/types/database"
import type { ColorPalette } from "@/types/analyze"

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ComparisonTable component
 */
export interface ComparisonTableProps {
  /** Array of apps to compare (2-4 apps) */
  apps: ReferenceAppRow[]
  /** Whether the comparison is loading */
  isLoading?: boolean
  /** AI-generated insights about the comparison */
  insights?: ComparisonInsights | null
  /** Whether insights are currently being generated */
  isGeneratingInsights?: boolean
  /** Callback to regenerate insights */
  onRegenerateInsights?: () => void
  /** Whether insights regeneration is in progress */
  isRegeneratingInsights?: boolean
  /** Error message if insight generation failed */
  insightsError?: string | null
  /** Additional class names */
  className?: string
}

/**
 * AI-generated comparison insights
 */
export interface ComparisonInsights {
  /** Summary of the comparison */
  summary: string
  /** Key similarities between apps */
  similarities: string[]
  /** Key differences between apps */
  differences: string[]
  /** Design pattern recommendations */
  recommendations: string[]
  /** Generated timestamp */
  generatedAt: string
}

/**
 * Props for the InsightsSection component
 */
export interface InsightsSectionProps {
  /** AI-generated insights */
  insights: ComparisonInsights | null
  /** Whether insights are currently being generated */
  isLoading: boolean
  /** Callback to regenerate insights */
  onRegenerate?: () => void
  /** Whether regeneration is in progress */
  isRegenerating?: boolean
  /** Error message if insight generation failed */
  error?: string | null
  /** Number of apps being compared */
  appCount?: number
}

/**
 * Feature matrix row data
 */
interface FeatureMatrixRow {
  /** Feature name */
  feature: string
  /** Feature category */
  category: "core" | "niceToHave" | "differentiator"
  /** Which apps have this feature (by app ID) */
  presentIn: string[]
  /** Whether this feature is shared across all apps */
  isShared: boolean
  /** Whether this feature is unique to one app */
  isUnique: boolean
}

/**
 * Color comparison data for a single color role
 */
interface ColorComparisonItem {
  /** Color role name (e.g., "primary", "secondary") */
  role: string
  /** Label for display */
  label: string
  /** Colors per app (appId -> color value) */
  colors: Record<string, string>
}

/**
 * Pattern comparison data
 */
interface PatternComparisonRow {
  /** Pattern name */
  patternName: string
  /** Apps that use this pattern (with frequency) */
  apps: {
    appId: string
    frequency: "single_screen" | "multiple_screens" | "all_screens"
    components: string[]
  }[]
  /** Whether all apps use this pattern */
  isShared: boolean
}

/**
 * Flow comparison data
 */
interface FlowComparisonRow {
  /** Flow name */
  flowName: string
  /** Apps that have this flow */
  apps: {
    appId: string
    complexity: "simple" | "moderate" | "complex"
    stepCount: number
  }[]
  /** Whether all apps have this flow */
  isShared: boolean
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Colors for each app position (up to 4 apps)
 */
const APP_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-100 dark:bg-blue-900/30" },
  { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-100 dark:bg-emerald-900/30" },
  { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-100 dark:bg-purple-900/30" },
  { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-100 dark:bg-orange-900/30" },
]

/**
 * Category configuration for features
 */
const FEATURE_CATEGORIES = {
  core: {
    label: "Core Features",
    icon: Star,
    className: "text-blue-600 dark:text-blue-400",
  },
  niceToHave: {
    label: "Nice to Have",
    icon: Sparkles,
    className: "text-green-600 dark:text-green-400",
  },
  differentiator: {
    label: "Differentiators",
    icon: Zap,
    className: "text-purple-600 dark:text-purple-400",
  },
} as const

/**
 * Color role labels
 */
const COLOR_LABELS: Record<keyof ColorPalette, string> = {
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * App color scheme type
 */
type AppColorScheme = {
  bg: string
  text: string
  light: string
}

/**
 * Get app color scheme by index
 */
function getAppColor(index: number): AppColorScheme {
  return APP_COLORS[index % APP_COLORS.length] as AppColorScheme
}

/**
 * Extract feature matrix from apps
 */
function buildFeatureMatrix(apps: ReferenceAppRow[]): FeatureMatrixRow[] {
  const featureMap = new Map<string, FeatureMatrixRow>()

  apps.forEach((app) => {
    if (!app.analysis?.featureSet) return

    const { core, niceToHave, differentiators } = app.analysis.featureSet

    // Process core features
    core?.forEach((feature) => {
      const existing = featureMap.get(feature)
      if (existing) {
        existing.presentIn.push(app.id)
      } else {
        featureMap.set(feature, {
          feature,
          category: "core",
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        })
      }
    })

    // Process nice-to-have features
    niceToHave?.forEach((feature) => {
      const existing = featureMap.get(feature)
      if (existing) {
        existing.presentIn.push(app.id)
      } else {
        featureMap.set(feature, {
          feature,
          category: "niceToHave",
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        })
      }
    })

    // Process differentiator features
    differentiators?.forEach((feature) => {
      const existing = featureMap.get(feature)
      if (existing) {
        existing.presentIn.push(app.id)
      } else {
        featureMap.set(feature, {
          feature,
          category: "differentiator",
          presentIn: [app.id],
          isShared: false,
          isUnique: false,
        })
      }
    })
  })

  // Calculate shared/unique status
  const totalApps = apps.length
  featureMap.forEach((row) => {
    row.isShared = row.presentIn.length === totalApps
    row.isUnique = row.presentIn.length === 1
  })

  // Sort: shared first, then by category, then by feature count
  return Array.from(featureMap.values()).sort((a, b) => {
    // Shared features first
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1
    // Then by category (core > niceToHave > differentiator)
    const categoryOrder = { core: 0, niceToHave: 1, differentiator: 2 }
    if (a.category !== b.category) return categoryOrder[a.category] - categoryOrder[b.category]
    // Then by presence count (more common first)
    if (a.presentIn.length !== b.presentIn.length) return b.presentIn.length - a.presentIn.length
    // Finally alphabetically
    return a.feature.localeCompare(b.feature)
  })
}

/**
 * Build color comparison data
 */
function buildColorComparison(apps: ReferenceAppRow[]): ColorComparisonItem[] {
  const colorRoles: (keyof ColorPalette)[] = [
    "primary",
    "secondary",
    "accent",
    "background",
    "surface",
    "text",
  ]

  return colorRoles.map((role) => ({
    role: role as string,
    label: COLOR_LABELS[role],
    colors: apps.reduce((acc, app) => {
      const color = app.analysis?.colorPalette?.[role]
      if (color && color !== "unknown" && color !== "") {
        acc[app.id] = color
      }
      return acc
    }, {} as Record<string, string>),
  }))
}

/**
 * Build pattern comparison data
 */
function buildPatternComparison(apps: ReferenceAppRow[]): PatternComparisonRow[] {
  const patternMap = new Map<string, PatternComparisonRow>()

  apps.forEach((app) => {
    app.analysis?.designPatterns?.forEach((pattern) => {
      const existing = patternMap.get(pattern.name)
      if (existing) {
        existing.apps.push({
          appId: app.id,
          frequency: pattern.frequency,
          components: pattern.components,
        })
      } else {
        patternMap.set(pattern.name, {
          patternName: pattern.name,
          apps: [
            {
              appId: app.id,
              frequency: pattern.frequency,
              components: pattern.components,
            },
          ],
          isShared: false,
        })
      }
    })
  })

  // Calculate shared status
  const totalApps = apps.length
  patternMap.forEach((row) => {
    row.isShared = row.apps.length === totalApps
  })

  return Array.from(patternMap.values()).sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1
    return b.apps.length - a.apps.length
  })
}

/**
 * Build flow comparison data
 */
function buildFlowComparison(apps: ReferenceAppRow[]): FlowComparisonRow[] {
  const flowMap = new Map<string, FlowComparisonRow>()

  apps.forEach((app) => {
    app.analysis?.userFlows?.forEach((flow) => {
      const existing = flowMap.get(flow.name)
      if (existing) {
        existing.apps.push({
          appId: app.id,
          complexity: flow.complexity,
          stepCount: flow.stepCount,
        })
      } else {
        flowMap.set(flow.name, {
          flowName: flow.name,
          apps: [
            {
              appId: app.id,
              complexity: flow.complexity,
              stepCount: flow.stepCount,
            },
          ],
          isShared: false,
        })
      }
    })
  })

  // Calculate shared status
  const totalApps = apps.length
  flowMap.forEach((row) => {
    row.isShared = row.apps.length === totalApps
  })

  return Array.from(flowMap.values()).sort((a, b) => {
    if (a.isShared !== b.isShared) return a.isShared ? -1 : 1
    return b.apps.length - a.apps.length
  })
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading skeleton for comparison table
 */
function ComparisonTableSkeleton({ appCount = 2 }: { appCount?: number }) {
  return (
    <div className="space-y-6">
      {/* App headers skeleton */}
      <div className="flex gap-4">
        <div className="w-48 shrink-0" />
        {Array.from({ length: appCount }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[180px]">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-48 shrink-0" />
          {Array.from({ length: appCount }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1 min-w-[180px]" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * App header card showing app info
 */
interface AppHeaderCardProps {
  app: ReferenceAppRow
  colorIndex: number
  className?: string
}

function AppHeaderCard({ app, colorIndex, className }: AppHeaderCardProps) {
  const colors = getAppColor(colorIndex)
  const iconUrl = app.screenshots?.[0]?.url

  return (
    <div
      className={cn(
        "flex flex-col items-center p-4 rounded-lg border-2",
        colors.light,
        className
      )}
    >
      {/* App Icon */}
      <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-muted mb-2">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={`${app.name} icon`}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Smartphone className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* App Name */}
      <h3 className="font-semibold text-sm text-center truncate max-w-full">
        {app.name}
      </h3>

      {/* Category Badge */}
      <Badge variant="secondary" className="mt-1 text-[10px]">
        {app.category}
      </Badge>

      {/* Analysis Status */}
      {app.analysis ? (
        <p className="text-[10px] text-muted-foreground mt-1">
          {app.analysis.screensAnalyzed} screens analyzed
        </p>
      ) : (
        <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1">
          Not analyzed
        </p>
      )}
    </div>
  )
}

/**
 * Feature presence indicator
 */
interface FeatureIndicatorProps {
  isPresent: boolean
  isShared: boolean
  isUnique: boolean
  appColorIndex: number
}

function FeatureIndicator({
  isPresent,
  isShared,
  isUnique,
  appColorIndex,
}: FeatureIndicatorProps) {
  const colors = getAppColor(appColorIndex)

  if (!isPresent) {
    return (
      <div className="flex justify-center">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center",
          isShared
            ? "bg-green-100 dark:bg-green-900/30"
            : isUnique
            ? colors.light
            : "bg-blue-100 dark:bg-blue-900/30"
        )}
      >
        <Check
          className={cn(
            "h-3.5 w-3.5",
            isShared
              ? "text-green-600 dark:text-green-400"
              : isUnique
              ? colors.text
              : "text-blue-600 dark:text-blue-400"
          )}
        />
      </div>
    </div>
  )
}

/**
 * Color swatch for comparison
 */
interface ColorSwatchComparisonProps {
  color: string | undefined
  label: string
  appName: string
}

function ColorSwatchComparison({ color, appName }: ColorSwatchComparisonProps) {
  const isValid = color && color !== "unknown" && color !== ""

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-8 w-8 rounded-lg border shadow-sm",
                !isValid && "bg-muted"
              )}
              style={isValid ? { backgroundColor: color } : undefined}
            />
            {isValid && (
              <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[60px]">
                {color}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {appName}: {isValid ? color : "Not detected"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Collapsible section wrapper
 */
interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Card className={className}>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
            {badge}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  )
}

/**
 * Feature matrix table
 */
interface FeatureMatrixProps {
  apps: ReferenceAppRow[]
  features: FeatureMatrixRow[]
}

function FeatureMatrix({ apps, features }: FeatureMatrixProps) {
  if (features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Info className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No features to compare. Make sure all selected apps have been analyzed.
        </p>
      </div>
    )
  }

  // Group features by category
  const coreFeatures = features.filter((f) => f.category === "core")
  const niceToHaveFeatures = features.filter((f) => f.category === "niceToHave")
  const differentiatorFeatures = features.filter((f) => f.category === "differentiator")

  const renderFeatureGroup = (
    groupFeatures: FeatureMatrixRow[],
    category: keyof typeof FEATURE_CATEGORIES
  ) => {
    if (groupFeatures.length === 0) return null

    const config = FEATURE_CATEGORIES[category]
    const Icon = config.icon

    return (
      <div className="space-y-2">
        {/* Category Header */}
        <div className="flex items-center gap-2 py-2 border-b">
          <Icon className={cn("h-4 w-4", config.className)} />
          <span className="text-sm font-medium">{config.label}</span>
          <Badge variant="secondary" className="text-[10px]">
            {groupFeatures.length}
          </Badge>
        </div>

        {/* Feature Rows */}
        {groupFeatures.map((row) => (
          <div
            key={row.feature}
            className={cn(
              "grid items-center gap-4 py-2 px-2 rounded-md",
              row.isShared && "bg-green-50 dark:bg-green-900/10",
              row.isUnique && "bg-muted/50"
            )}
            style={{
              gridTemplateColumns: `200px repeat(${apps.length}, 1fr)`,
            }}
          >
            {/* Feature Name */}
            <div className="flex items-center gap-2">
              <span className="text-sm truncate">{row.feature}</span>
              {row.isShared && (
                <Badge
                  variant="outline"
                  className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  Shared
                </Badge>
              )}
              {row.isUnique && (
                <Badge variant="outline" className="text-[9px]">
                  Unique
                </Badge>
              )}
            </div>

            {/* App Indicators */}
            {apps.map((app, idx) => (
              <FeatureIndicator
                key={app.id}
                isPresent={row.presentIn.includes(app.id)}
                isShared={row.isShared}
                isUnique={row.isUnique}
                appColorIndex={idx}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
          </div>
          <span>Shared by all apps</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span>Present in multiple apps</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
            <X className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <span>Not present</span>
        </div>
      </div>

      {/* Feature Groups */}
      <div className="overflow-x-auto">
        <div className="min-w-fit space-y-6">
          {renderFeatureGroup(coreFeatures, "core")}
          {renderFeatureGroup(niceToHaveFeatures, "niceToHave")}
          {renderFeatureGroup(differentiatorFeatures, "differentiator")}
        </div>
      </div>
    </div>
  )
}

/**
 * Color palette comparison
 */
interface ColorComparisonProps {
  apps: ReferenceAppRow[]
  colorData: ColorComparisonItem[]
}

function ColorComparison({ apps, colorData }: ColorComparisonProps) {
  if (colorData.every((c) => Object.keys(c.colors).length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Palette className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No color palette data available. Make sure apps have been analyzed.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-fit">
        <thead>
          <tr>
            <th className="text-left text-sm font-medium text-muted-foreground pb-4 pr-4 w-32">
              Color Role
            </th>
            {apps.map((app, idx) => (
              <th
                key={app.id}
                className="text-center text-sm font-medium pb-4 px-4 min-w-[100px]"
              >
                <span className={getAppColor(idx).text}>{app.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colorData.map((item) => (
            <tr key={item.role} className="border-t">
              <td className="py-3 pr-4 text-sm font-medium">{item.label}</td>
              {apps.map((app) => (
                <td key={app.id} className="py-3 px-4">
                  <ColorSwatchComparison
                    color={item.colors[app.id]}
                    label={item.label}
                    appName={app.name}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Typography comparison
 */
interface TypographyComparisonProps {
  apps: ReferenceAppRow[]
}

function TypographyComparison({ apps }: TypographyComparisonProps) {
  const hasTypography = apps.some((app) => app.analysis?.typography)

  if (!hasTypography) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Type className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No typography data available. Make sure apps have been analyzed.
        </p>
      </div>
    )
  }

  const typographyFields = [
    { key: "headingFont", label: "Heading Font" },
    { key: "headingSize", label: "Heading Size" },
    { key: "bodyFont", label: "Body Font" },
    { key: "bodySize", label: "Body Size" },
  ] as const

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-fit">
        <thead>
          <tr>
            <th className="text-left text-sm font-medium text-muted-foreground pb-4 pr-4 w-32">
              Property
            </th>
            {apps.map((app, idx) => (
              <th
                key={app.id}
                className="text-center text-sm font-medium pb-4 px-4 min-w-[120px]"
              >
                <span className={getAppColor(idx).text}>{app.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {typographyFields.map((field) => (
            <tr key={field.key} className="border-t">
              <td className="py-3 pr-4 text-sm font-medium">{field.label}</td>
              {apps.map((app) => {
                const value = app.analysis?.typography?.[field.key]
                return (
                  <td key={app.id} className="py-3 px-4 text-center">
                    <span className="text-sm">
                      {value || <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Pattern comparison
 */
interface PatternComparisonProps {
  apps: ReferenceAppRow[]
  patterns: PatternComparisonRow[]
}

function PatternComparison({ apps, patterns }: PatternComparisonProps) {
  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Layout className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No UI patterns to compare. Make sure apps have been analyzed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>
            Shared: {patterns.filter((p) => p.isShared).length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>
            Unique: {patterns.filter((p) => !p.isShared).length}
          </span>
        </div>
      </div>

      {/* Pattern list */}
      <div className="overflow-x-auto">
        <div className="min-w-fit space-y-2">
          {patterns.map((pattern) => (
            <div
              key={pattern.patternName}
              className={cn(
                "grid items-center gap-4 py-3 px-3 rounded-lg border",
                pattern.isShared && "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
              )}
              style={{
                gridTemplateColumns: `200px repeat(${apps.length}, 1fr)`,
              }}
            >
              {/* Pattern Name */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {pattern.patternName}
                </span>
                {pattern.isShared && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    All Apps
                  </Badge>
                )}
              </div>

              {/* App status */}
              {apps.map((app, idx) => {
                const appPattern = pattern.apps.find((p) => p.appId === app.id)
                return (
                  <div key={app.id} className="flex justify-center">
                    {appPattern ? (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", getAppColor(idx).light)}
                      >
                        {appPattern.frequency.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Flow comparison
 */
interface FlowComparisonProps {
  apps: ReferenceAppRow[]
  flows: FlowComparisonRow[]
}

function FlowComparison({ apps, flows }: FlowComparisonProps) {
  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No user flows to compare. Make sure apps have been analyzed.
        </p>
      </div>
    )
  }

  const complexityColors = {
    simple: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    complex: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>
            Shared Flows: {flows.filter((f) => f.isShared).length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>
            Unique Flows: {flows.filter((f) => !f.isShared).length}
          </span>
        </div>
      </div>

      {/* Flow list */}
      <div className="overflow-x-auto">
        <div className="min-w-fit space-y-2">
          {flows.map((flow) => (
            <div
              key={flow.flowName}
              className={cn(
                "grid items-center gap-4 py-3 px-3 rounded-lg border",
                flow.isShared && "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
              )}
              style={{
                gridTemplateColumns: `200px repeat(${apps.length}, 1fr)`,
              }}
            >
              {/* Flow Name */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {flow.flowName}
                </span>
                {flow.isShared && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    All Apps
                  </Badge>
                )}
              </div>

              {/* App status */}
              {apps.map((app) => {
                const appFlow = flow.apps.find((f) => f.appId === app.id)
                return (
                  <div key={app.id} className="flex flex-col items-center gap-1">
                    {appFlow ? (
                      <>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", complexityColors[appFlow.complexity])}
                        >
                          {appFlow.complexity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {appFlow.stepCount} steps
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * AI Insights section - Enhanced with Claude integration
 *
 * This component displays AI-generated insights from Claude about the comparison
 * between multiple apps. It includes:
 * - Overall summary
 * - Key similarities between apps
 * - Key differences between apps
 * - Actionable recommendations
 * - Loading states with animated placeholders
 * - Error handling with retry capability
 * - Expandable/collapsible sections
 */
function InsightsSection({
  insights,
  isLoading,
  onRegenerate,
  isRegenerating,
  error,
  appCount = 2,
}: InsightsSectionProps) {
  const [expandedSections, setExpandedSections] = React.useState<{
    similarities: boolean
    differences: boolean
    recommendations: boolean
  }>({
    similarities: true,
    differences: true,
    recommendations: true,
  })

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Loading state with skeleton placeholders
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="h-5 w-5 text-primary/30" />
                </div>
              </div>
              <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
              <Badge variant="secondary" className="text-[10px] animate-pulse">
                Analyzing {appCount} apps...
              </Badge>
            </div>
          </div>
          <CardDescription>
            Claude is analyzing your apps to generate comprehensive comparison insights...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading skeleton for summary */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Loading skeleton for sections */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 p-4 rounded-lg bg-muted/30">
                <Skeleton className="h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>

          {/* Animated progress indicator */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="animate-pulse">Processing with Claude AI...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Insight Generation Failed</CardTitle>
            </div>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Retry
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription className="text-destructive/80">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The AI insights couldn&apos;t be generated at this time. The comparison data above is
            still available. You can try regenerating the insights or continue without them.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Empty state - no insights and no error
  if (!insights) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-muted-foreground">AI Insights</CardTitle>
            </div>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
                    Generate Insights
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            AI-powered insights have not been generated yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Click &ldquo;Generate Insights&rdquo; to have Claude analyze the comparison and provide
            detailed similarities, differences, and recommendations.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Format the generated date nicely
  const formattedDate = new Date(insights.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Count total insights
  const totalInsights =
    insights.similarities.length +
    insights.differences.length +
    insights.recommendations.length

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
      {/* Header with gradient accent */}
      <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500" />

      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI-Powered Insights
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {totalInsights} insights
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Generated by Claude • {formattedDate}
              </CardDescription>
            </div>
          </div>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-xs"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Regenerate
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Section */}
        {insights.summary && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insights.summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Three-column grid for insight categories */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Similarities */}
          {insights.similarities.length > 0 && (
            <InsightCategory
              title="Similarities"
              icon={<Check className="h-4 w-4" />}
              iconColor="text-green-500"
              bgColor="bg-green-50 dark:bg-green-950/20"
              borderColor="border-green-200 dark:border-green-800"
              items={insights.similarities}
              isExpanded={expandedSections.similarities}
              onToggle={() => toggleSection("similarities")}
            />
          )}

          {/* Differences */}
          {insights.differences.length > 0 && (
            <InsightCategory
              title="Differences"
              icon={<ArrowLeftRight className="h-4 w-4" />}
              iconColor="text-blue-500"
              bgColor="bg-blue-50 dark:bg-blue-950/20"
              borderColor="border-blue-200 dark:border-blue-800"
              items={insights.differences}
              isExpanded={expandedSections.differences}
              onToggle={() => toggleSection("differences")}
            />
          )}

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <InsightCategory
              title="Recommendations"
              icon={<Lightbulb className="h-4 w-4" />}
              iconColor="text-purple-500"
              bgColor="bg-purple-50 dark:bg-purple-950/20"
              borderColor="border-purple-200 dark:border-purple-800"
              items={insights.recommendations}
              isExpanded={expandedSections.recommendations}
              onToggle={() => toggleSection("recommendations")}
            />
          )}
        </div>

        {/* Powered by Claude badge */}
        <div className="flex items-center justify-center pt-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Powered by Claude AI</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual insight category card
 */
interface InsightCategoryProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  bgColor: string
  borderColor: string
  items: string[]
  isExpanded: boolean
  onToggle: () => void
}

function InsightCategory({
  title,
  icon,
  iconColor,
  bgColor,
  borderColor,
  items,
  isExpanded,
  onToggle,
}: InsightCategoryProps) {
  const displayItems = isExpanded ? items : items.slice(0, 3)
  const hasMore = items.length > 3

  return (
    <div className={cn("rounded-lg border p-4", bgColor, borderColor)}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-800", iconColor)}>
            {icon}
          </div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary" className="text-[10px]">
            {items.length}
          </Badge>
        </div>
        {hasMore && (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {displayItems.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs">
            <div className={cn("mt-0.5 h-1.5 w-1.5 rounded-full shrink-0", iconColor.replace("text-", "bg-"))} />
            <span className="text-muted-foreground leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>

      {hasMore && !isExpanded && (
        <button
          onClick={onToggle}
          className="mt-2 text-[10px] text-primary hover:underline"
        >
          Show {items.length - 3} more...
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ComparisonTable - Matrix view for comparing multiple analyzed apps
 *
 * Features:
 * - App headers with icons and metadata
 * - Feature matrix with shared/unique highlighting
 * - Color palette comparison with swatches
 * - Typography comparison table
 * - UI pattern comparison
 * - User flow comparison
 * - AI-generated insights section with Claude integration
 *
 * @example
 * ```tsx
 * <ComparisonTable
 *   apps={selectedApps}
 *   isLoading={false}
 *   insights={aiInsights}
 *   isGeneratingInsights={false}
 *   onRegenerateInsights={handleRegenerate}
 *   isRegeneratingInsights={false}
 *   insightsError={null}
 * />
 * ```
 */
export function ComparisonTable({
  apps,
  isLoading = false,
  insights = null,
  isGeneratingInsights = false,
  onRegenerateInsights,
  isRegeneratingInsights = false,
  insightsError = null,
  className,
}: ComparisonTableProps) {
  // Build comparison data
  const featureMatrix = React.useMemo(() => buildFeatureMatrix(apps), [apps])
  const colorComparison = React.useMemo(() => buildColorComparison(apps), [apps])
  const patternComparison = React.useMemo(() => buildPatternComparison(apps), [apps])
  const flowComparison = React.useMemo(() => buildFlowComparison(apps), [apps])

  // Calculate summary stats
  const sharedFeatureCount = featureMatrix.filter((f) => f.isShared).length
  const totalFeatureCount = featureMatrix.length
  const sharedPatternCount = patternComparison.filter((p) => p.isShared).length
  const sharedFlowCount = flowComparison.filter((f) => f.isShared).length

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <ComparisonTableSkeleton appCount={apps.length || 2} />
      </div>
    )
  }

  // Show empty state
  if (apps.length < 2) {
    return (
      <div className={cn("w-full", className)}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select Apps to Compare</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Select at least 2 analyzed apps from the dropdown above to see a
              detailed comparison of their features, design patterns, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* App Headers */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="w-[200px] shrink-0" /> {/* Spacer for row labels */}
        {apps.map((app, idx) => (
          <AppHeaderCard
            key={app.id}
            app={app}
            colorIndex={idx}
            className="flex-1 min-w-[150px]"
          />
        ))}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparison Overview</CardTitle>
          <CardDescription>
            Comparing {apps.length} apps with {totalFeatureCount} total features identified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {sharedFeatureCount}
                </p>
                <p className="text-xs text-muted-foreground">Shared Features</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Layout className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {sharedPatternCount}
                </p>
                <p className="text-xs text-muted-foreground">Common Patterns</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {sharedFlowCount}
                </p>
                <p className="text-xs text-muted-foreground">Similar Flows</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights - Powered by Claude */}
      <InsightsSection
        insights={insights}
        isLoading={isGeneratingInsights}
        onRegenerate={onRegenerateInsights}
        isRegenerating={isRegeneratingInsights}
        error={insightsError}
        appCount={apps.length}
      />

      {/* Feature Matrix */}
      <CollapsibleSection
        title="Feature Comparison"
        icon={<Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        badge={
          <Badge variant="secondary" className="ml-2">
            {totalFeatureCount} features
          </Badge>
        }
        defaultOpen
      >
        <FeatureMatrix apps={apps} features={featureMatrix} />
      </CollapsibleSection>

      {/* Color Palette Comparison */}
      <CollapsibleSection
        title="Color Palette"
        icon={<Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" />}
        defaultOpen={false}
      >
        <ColorComparison apps={apps} colorData={colorComparison} />
      </CollapsibleSection>

      {/* Typography Comparison */}
      <CollapsibleSection
        title="Typography"
        icon={<Type className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
        defaultOpen={false}
      >
        <TypographyComparison apps={apps} />
      </CollapsibleSection>

      {/* UI Patterns Comparison */}
      <CollapsibleSection
        title="UI Patterns"
        icon={<Layout className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        badge={
          <Badge variant="secondary" className="ml-2">
            {patternComparison.length} patterns
          </Badge>
        }
        defaultOpen={false}
      >
        <PatternComparison apps={apps} patterns={patternComparison} />
      </CollapsibleSection>

      {/* User Flows Comparison */}
      <CollapsibleSection
        title="User Flows"
        icon={<GitBranch className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        badge={
          <Badge variant="secondary" className="ml-2">
            {flowComparison.length} flows
          </Badge>
        }
        defaultOpen={false}
      >
        <FlowComparison apps={apps} flows={flowComparison} />
      </CollapsibleSection>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export {
  ComparisonTableSkeleton,
  AppHeaderCard,
  FeatureIndicator,
  FeatureMatrix,
  ColorComparison,
  TypographyComparison,
  PatternComparison,
  FlowComparison,
  InsightsSection,
  CollapsibleSection,
}

export type {
  FeatureMatrixRow,
  ColorComparisonItem,
  PatternComparisonRow,
  FlowComparisonRow,
}
