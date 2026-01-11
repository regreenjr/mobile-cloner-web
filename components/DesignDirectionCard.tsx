"use client"

import * as React from "react"
import { ThumbsUp, Check, Download, Sparkles, Type, Palette, Layers } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type {
  DesignDirection,
  DesignColorPalette,
  DesignTypography,
  ComponentPatterns,
} from "@/types/design"

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the DesignDirectionCard component
 */
export interface DesignDirectionCardProps {
  /** The design direction data to display */
  direction: DesignDirection
  /** Whether this direction is currently selected */
  isSelected?: boolean
  /** Whether the current user has voted for this direction */
  hasVoted?: boolean
  /** Whether voting is in progress */
  isVoting?: boolean
  /** Callback when the vote button is clicked */
  onVote?: (directionId: string) => void
  /** Callback when the select button is clicked */
  onSelect?: (directionId: string) => void
  /** Callback when the export button is clicked */
  onExport?: (directionId: string) => void
  /** Additional class names */
  className?: string
}

/**
 * Props for the ColorPalettePreview sub-component
 */
export interface ColorPalettePreviewProps {
  /** The color palette to display */
  palette: DesignColorPalette
  /** Additional class names */
  className?: string
}

/**
 * Props for the TypographyPreview sub-component
 */
export interface TypographyPreviewProps {
  /** The typography settings to display */
  typography: DesignTypography
  /** Primary color for text preview */
  primaryColor?: string
  /** Additional class names */
  className?: string
}

/**
 * Props for the ComponentPreview sub-component
 */
export interface ComponentPreviewProps {
  /** The component patterns to display */
  patterns: ComponentPatterns
  /** Colors to use for component preview */
  colors: DesignColorPalette
  /** Additional class names */
  className?: string
}

// ============================================================================
// Color Labels for Display
// ============================================================================

const CORE_COLORS: (keyof DesignColorPalette)[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
]

const SEMANTIC_COLORS: (keyof DesignColorPalette)[] = [
  'success',
  'warning',
  'error',
  'info',
]

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * ColorSwatch - A single color swatch with tooltip
 */
function ColorSwatch({
  color,
  label,
  size = "md",
  className,
}: {
  color: string
  label: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-lg border shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform hover:scale-110 cursor-pointer",
              sizeClasses[size],
              className
            )}
            style={{ backgroundColor: color }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium capitalize">{label}</span>
          <span className="text-xs font-mono text-muted-foreground">{color}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * ColorPalettePreview - Displays a compact color palette grid
 */
export function ColorPalettePreview({ palette, className }: ColorPalettePreviewProps) {
  // Get core colors that exist in the palette
  const coreColors = CORE_COLORS.filter(
    (key) => palette[key] && palette[key] !== ""
  )
  const semanticColors = SEMANTIC_COLORS.filter(
    (key) => palette[key] && palette[key] !== ""
  )

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Colors
        </span>
      </div>

      {/* Core colors row */}
      <div className="flex flex-wrap gap-2">
        {coreColors.map((key) => (
          <ColorSwatch
            key={key}
            color={palette[key]}
            label={key.replace(/([A-Z])/g, " $1").trim()}
            size="md"
          />
        ))}
      </div>

      {/* Semantic colors row (smaller) */}
      {semanticColors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {semanticColors.map((key) => (
            <ColorSwatch
              key={key}
              color={palette[key]}
              label={key}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * TypographyPreview - Shows font samples with actual fonts applied
 */
export function TypographyPreview({
  typography,
  primaryColor = "#1a1a1a",
  className,
}: TypographyPreviewProps) {
  const { fontFamily, fontSize, fontWeight } = typography

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Typography
        </span>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        {/* Primary heading sample */}
        <div
          className="truncate"
          style={{
            fontFamily: `'${fontFamily.primary}', sans-serif`,
            fontSize: `${fontSize["2xl"]}px`,
            fontWeight: fontWeight.bold,
            color: primaryColor,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          Heading Aa
        </div>

        {/* Secondary body sample */}
        <div
          className="text-muted-foreground truncate"
          style={{
            fontFamily: `'${fontFamily.secondary}', sans-serif`,
            fontSize: `${fontSize.base}px`,
            fontWeight: fontWeight.normal,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          Body text sample 123
        </div>

        {/* Font family labels */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline" className="text-xs font-normal">
            {fontFamily.primary}
          </Badge>
          {fontFamily.secondary !== fontFamily.primary && (
            <Badge variant="outline" className="text-xs font-normal">
              {fontFamily.secondary}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ComponentPreview - Shows mini component previews (button, card, input styles)
 */
export function ComponentPreview({
  patterns,
  colors,
  className,
}: ComponentPreviewProps) {
  const { buttons, cards, inputs } = patterns

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Components
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Mini Button Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Button</span>
          <div className="flex gap-1.5">
            {/* Primary button */}
            <div
              className="px-3 py-1 text-xs font-medium text-white transition-transform hover:scale-105"
              style={{
                backgroundColor: colors.primary,
                borderRadius: `${buttons.borderRadius}px`,
                boxShadow: buttons.hasShadow
                  ? "0 1px 2px 0 rgb(0 0 0 / 0.05)"
                  : "none",
              }}
            >
              Primary
            </div>
            {/* Outline button */}
            {buttons.variants.includes("outline") && (
              <div
                className="px-3 py-1 text-xs font-medium border transition-transform hover:scale-105"
                style={{
                  borderColor: colors.primary,
                  color: colors.primary,
                  borderRadius: `${buttons.borderRadius}px`,
                }}
              >
                Outline
              </div>
            )}
          </div>
        </div>

        {/* Mini Card Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Card</span>
          <div
            className="flex-1 p-2 text-xs"
            style={{
              backgroundColor: colors.surface || colors.background,
              borderRadius: `${cards.borderRadius}px`,
              border: cards.hasBorder ? `1px solid ${colors.border || colors.borderLight}` : "none",
              boxShadow: cards.hasShadow
                ? cards.shadowIntensity === "strong"
                  ? "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  : cards.shadowIntensity === "medium"
                  ? "0 2px 4px -1px rgb(0 0 0 / 0.06)"
                  : "0 1px 2px 0 rgb(0 0 0 / 0.05)"
                : "none",
            }}
          >
            <div
              className="font-medium truncate"
              style={{ color: colors.text }}
            >
              Card Title
            </div>
            <div
              className="truncate"
              style={{ color: colors.textSecondary }}
            >
              Description text
            </div>
          </div>
        </div>

        {/* Mini Input Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Input</span>
          <div
            className="flex-1 px-2 py-1 text-xs"
            style={{
              backgroundColor: colors.surface || colors.background,
              borderRadius: `${inputs.borderRadius}px`,
              border:
                inputs.borderStyle === "solid"
                  ? `1px solid ${colors.border || colors.borderLight}`
                  : inputs.borderStyle === "underline"
                  ? "none"
                  : "none",
              borderBottom:
                inputs.borderStyle === "underline"
                  ? `1px solid ${colors.border || colors.borderLight}`
                  : undefined,
              color: colors.textMuted,
            }}
          >
            Placeholder text...
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * MoodKeywordBadges - Displays mood keywords as badges
 */
function MoodKeywordBadges({
  keywords,
  className,
}: {
  keywords: string[]
  className?: string
}) {
  if (!keywords || keywords.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {keywords.slice(0, 4).map((keyword, index) => (
        <Badge
          key={`${keyword}-${index}`}
          variant="secondary"
          className="text-xs font-normal px-2 py-0.5"
        >
          {keyword}
        </Badge>
      ))}
      {keywords.length > 4 && (
        <Badge variant="outline" className="text-xs font-normal px-2 py-0.5">
          +{keywords.length - 4}
        </Badge>
      )}
    </div>
  )
}

/**
 * VoteButton - Button for voting on a direction
 */
function VoteButton({
  votes,
  hasVoted,
  isVoting,
  onVote,
}: {
  votes: number
  hasVoted: boolean
  isVoting: boolean
  onVote?: () => void
}) {
  return (
    <Button
      variant={hasVoted ? "default" : "outline"}
      size="sm"
      onClick={onVote}
      disabled={isVoting}
      className={cn(
        "gap-1.5 transition-all",
        hasVoted && "bg-green-600 hover:bg-green-700"
      )}
    >
      <ThumbsUp className={cn("h-4 w-4", hasVoted && "fill-current")} />
      <span className="font-semibold">{votes}</span>
      {isVoting && <span className="text-xs">...</span>}
    </Button>
  )
}

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Skeleton loader for the DesignDirectionCard
 */
export function DesignDirectionCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex gap-1.5 pt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Color palette skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Typography skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>

        {/* Components skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-14 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DesignDirectionCard - Displays a complete design direction with previews
 *
 * Features:
 * - Color palette swatches with tooltips
 * - Typography preview with actual fonts
 * - Component style previews (buttons, cards, inputs)
 * - Mood keyword badges
 * - Vote button with count
 * - Selection and export actions
 *
 * @example
 * ```tsx
 * <DesignDirectionCard
 *   direction={designDirection}
 *   isSelected={selected}
 *   hasVoted={userHasVoted}
 *   onVote={(id) => handleVote(id)}
 *   onSelect={(id) => handleSelect(id)}
 *   onExport={(id) => handleExport(id)}
 * />
 * ```
 */
export function DesignDirectionCard({
  direction,
  isSelected = false,
  hasVoted = false,
  isVoting = false,
  onVote,
  onSelect,
  onExport,
  className,
}: DesignDirectionCardProps) {
  const {
    id,
    directionNumber,
    name,
    description,
    moodKeywords,
    colorPalette,
    typography,
    componentPatterns,
    votes,
  } = direction

  return (
    <Card
      className={cn(
        "h-full transition-all duration-200",
        isSelected && "ring-2 ring-primary border-primary shadow-lg",
        !isSelected && "hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold truncate">
                {name}
              </CardTitle>
              {isSelected && (
                <Badge className="bg-primary text-primary-foreground shrink-0">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
            {directionNumber}
          </div>
        </div>

        {/* Mood Keywords */}
        <MoodKeywordBadges keywords={moodKeywords} className="pt-2" />
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Color Palette Preview */}
        <ColorPalettePreview palette={colorPalette} />

        {/* Typography Preview */}
        <TypographyPreview
          typography={typography}
          primaryColor={colorPalette.text}
        />

        {/* Component Patterns Preview */}
        <ComponentPreview
          patterns={componentPatterns}
          colors={colorPalette}
        />
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex gap-2 flex-wrap">
            {/* Select Button */}
            {onSelect && !isSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(id)}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Select
              </Button>
            )}

            {/* Export Button */}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExport(id)}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>

          {/* Vote Button */}
          {onVote && (
            <VoteButton
              votes={votes}
              hasVoted={hasVoted}
              isVoting={isVoting}
              onVote={() => onVote(id)}
            />
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// Grid Component for Multiple Cards
// ============================================================================

/**
 * Props for DesignDirectionGrid
 */
export interface DesignDirectionGridProps {
  /** Array of design directions to display */
  directions: DesignDirection[]
  /** ID of the currently selected direction */
  selectedId?: string | null
  /** IDs of directions the user has voted for */
  votedIds?: string[]
  /** ID of direction currently being voted on */
  votingId?: string | null
  /** Callback when vote is clicked */
  onVote?: (directionId: string) => void
  /** Callback when select is clicked */
  onSelect?: (directionId: string) => void
  /** Callback when export is clicked */
  onExport?: (directionId: string) => void
  /** Whether grid is loading */
  isLoading?: boolean
  /** Number of skeleton cards to show when loading */
  skeletonCount?: number
  /** Additional class names */
  className?: string
}

/**
 * DesignDirectionGrid - Displays multiple design direction cards in a grid
 *
 * @example
 * ```tsx
 * <DesignDirectionGrid
 *   directions={directions}
 *   selectedId={selectedDirection?.id}
 *   votedIds={userVotedIds}
 *   onVote={handleVote}
 *   onSelect={handleSelect}
 *   onExport={handleExport}
 * />
 * ```
 */
export function DesignDirectionGrid({
  directions,
  selectedId,
  votedIds = [],
  votingId,
  onVote,
  onSelect,
  onExport,
  isLoading = false,
  skeletonCount = 4,
  className,
}: DesignDirectionGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <DesignDirectionCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (directions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Palette className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No Design Directions
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
          Generate design directions from an analyzed app to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      {directions.map((direction) => (
        <DesignDirectionCard
          key={direction.id}
          direction={direction}
          isSelected={selectedId === direction.id}
          hasVoted={votedIds.includes(direction.id)}
          isVoting={votingId === direction.id}
          onVote={onVote}
          onSelect={onSelect}
          onExport={onExport}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export {
  ColorSwatch,
  MoodKeywordBadges,
  VoteButton,
}
