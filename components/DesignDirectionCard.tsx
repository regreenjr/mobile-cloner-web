"use client"

import * as React from "react"
import { ThumbsUp, Check, Download, Sparkles, Type, Palette, Layers, Smartphone } from "lucide-react"

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
 * DesignMockupPreview - High-fidelity iPhone mockup showing design direction applied
 * Renders different screen types based on direction number for variety
 */
export function DesignMockupPreview({
  direction,
  className,
}: {
  direction: DesignDirection
  className?: string
}) {
  const { colorPalette, typography, componentPatterns, name, directionNumber, moodKeywords } = direction

  // Determine screen type based on direction number
  const screenType = ['onboarding', 'home', 'selection', 'action'][directionNumber % 4] as 'onboarding' | 'home' | 'selection' | 'action'

  // Get key colors for palette strip
  const keyColors = [
    { name: 'Primary', color: colorPalette.primary },
    { name: 'Accent', color: colorPalette.accent },
    { name: 'Background', color: colorPalette.background },
    { name: 'Surface', color: colorPalette.surface },
    { name: 'Text', color: colorPalette.text },
    { name: 'Success', color: colorPalette.success },
  ].filter(c => c.color) // Remove undefined colors

  return (
    <div className={cn("space-y-4", className)}>
      {/* Direction Label */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {name} Preview
          </span>
        </div>
        {moodKeywords.length > 0 && (
          <p className="text-xs text-muted-foreground italic">
            "{moodKeywords[0]}"
          </p>
        )}
      </div>

      {/* iPhone Mockup */}
      <div className="relative mx-auto" style={{ width: '280px' }}>
        {/* iPhone Frame with shadow and depth */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl">
          {/* Inner bezel */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-black">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-b-3xl z-20 flex items-end justify-center pb-1">
              <div className="w-14 h-1 bg-gray-800 rounded-full" />
            </div>

            {/* Screen Content */}
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: '9/19.5',
                backgroundColor: colorPalette.background
              }}
            >
              {/* Status Bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-3 pb-2 z-10">
                <div className="text-[10px] font-semibold" style={{ color: colorPalette.text }}>
                  9:41
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke={colorPalette.text} strokeWidth="2">
                    <rect x="1" y="5" width="22" height="14" rx="2" />
                    <path d="M23 13v-2" />
                  </svg>
                </div>
              </div>

              {/* Screen Content Based on Type */}
              <div className="pt-12 pb-8 px-6 h-full flex flex-col">
                {screenType === 'onboarding' && (
                  <OnboardingScreen
                    colorPalette={colorPalette}
                    typography={typography}
                    componentPatterns={componentPatterns}
                    name={name}
                  />
                )}
                {screenType === 'home' && (
                  <HomeScreen
                    colorPalette={colorPalette}
                    typography={typography}
                    componentPatterns={componentPatterns}
                  />
                )}
                {screenType === 'selection' && (
                  <SelectionScreen
                    colorPalette={colorPalette}
                    typography={typography}
                    componentPatterns={componentPatterns}
                  />
                )}
                {screenType === 'action' && (
                  <ActionScreen
                    colorPalette={colorPalette}
                    typography={typography}
                    componentPatterns={componentPatterns}
                  />
                )}
              </div>

              {/* Screen glare effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Frame highlight */}
          <div className="absolute inset-0 rounded-[3rem] ring-1 ring-white/10 pointer-events-none" />
        </div>

        {/* Reflection under phone */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-8 blur-xl opacity-40"
          style={{ background: `radial-gradient(ellipse, ${colorPalette.primary}40, transparent)` }}
        />
      </div>

      {/* Color Palette Strip */}
      <div className="flex items-center justify-center gap-1.5 px-4">
        {keyColors.slice(0, 6).map((colorItem, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div
              className="w-6 h-6 rounded-md border border-black/10 shadow-sm"
              style={{ backgroundColor: colorItem.color }}
              title={`${colorItem.name}: ${colorItem.color}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Onboarding/Value Prop Screen
 */
function OnboardingScreen({
  colorPalette,
  typography,
  componentPatterns,
  name,
}: {
  colorPalette: any
  typography: any
  componentPatterns: any
  name: string
}) {
  return (
    <div className="flex flex-col items-center justify-between h-full text-center">
      {/* Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-2">
        {/* Icon/Visual Element */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${colorPalette.primary}, ${colorPalette.accent})`,
          }}
        >
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>

        {/* Headline */}
        <h1
          className="text-2xl leading-tight"
          style={{
            fontFamily: `'${typography.fontFamily.primary}', sans-serif`,
            fontWeight: typography.fontWeight.bold,
            color: colorPalette.text,
          }}
        >
          Welcome to {name}
        </h1>

        {/* Description */}
        <p
          className="text-sm leading-relaxed max-w-xs"
          style={{
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            fontWeight: typography.fontWeight.normal,
            color: colorPalette.textSecondary,
          }}
        >
          Experience a beautifully designed interface that puts your needs first
        </p>
      </div>

      {/* CTA Area */}
      <div className="w-full space-y-3">
        {/* Primary Button */}
        <button
          className="w-full py-3.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: colorPalette.primary,
            color: '#FFFFFF',
            borderRadius: `${componentPatterns.buttons.borderRadius}px`,
            boxShadow: componentPatterns.buttons.hasShadow ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Get Started
        </button>

        {/* Skip Link */}
        <button
          className="w-full text-sm"
          style={{
            color: colorPalette.textSecondary,
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            fontWeight: typography.fontWeight.normal,
          }}
        >
          Skip for now
        </button>

        {/* Page Indicators */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === 1 ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === 1 ? colorPalette.primary : colorPalette.border || colorPalette.textSecondary + '40',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Home/Main Navigation Screen
 */
function HomeScreen({
  colorPalette,
  typography,
  componentPatterns,
}: {
  colorPalette: any
  typography: any
  componentPatterns: any
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h2
          className="text-xl"
          style={{
            fontFamily: `'${typography.fontFamily.primary}', sans-serif`,
            fontWeight: typography.fontWeight.bold,
            color: colorPalette.text,
          }}
        >
          Good morning
        </h2>
        <p
          className="text-xs"
          style={{
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            color: colorPalette.textSecondary,
          }}
        >
          Ready to get started?
        </p>
      </div>

      {/* Quick Stats Card */}
      <div
        className="p-4 mb-4"
        style={{
          backgroundColor: colorPalette.surface,
          borderRadius: `${componentPatterns.cards.borderRadius}px`,
          border: componentPatterns.cards.hasBorder ? `1px solid ${colorPalette.border}` : 'none',
          boxShadow: componentPatterns.cards.hasShadow
            ? componentPatterns.cards.shadowIntensity === 'strong'
              ? '0 8px 16px rgba(0,0,0,0.12)'
              : '0 2px 8px rgba(0,0,0,0.06)'
            : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs mb-1"
              style={{
                fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
                color: colorPalette.textSecondary,
              }}
            >
              Your progress
            </p>
            <p
              className="text-2xl"
              style={{
                fontFamily: `'${typography.fontFamily.primary}', sans-serif`,
                fontWeight: typography.fontWeight.bold,
                color: colorPalette.text,
              }}
            >
              75%
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colorPalette.accent + '20' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={colorPalette.accent} strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {[
          { label: 'Start', icon: 'play' },
          { label: 'Browse', icon: 'search' },
          { label: 'Activity', icon: 'chart' },
          { label: 'Settings', icon: 'settings' },
        ].map((item, idx) => (
          <button
            key={idx}
            className="flex flex-col items-center justify-center gap-2 py-6 transition-transform active:scale-95"
            style={{
              backgroundColor: colorPalette.surface,
              borderRadius: `${componentPatterns.cards.borderRadius}px`,
              border: componentPatterns.cards.hasBorder ? `1px solid ${colorPalette.border}` : 'none',
              boxShadow: componentPatterns.cards.hasShadow ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colorPalette.primary + '15' }}
            >
              <div className="w-5 h-5" style={{ color: colorPalette.primary }}>
                {/* Placeholder icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
            </div>
            <span
              className="text-xs font-medium"
              style={{
                fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
                color: colorPalette.text,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Selection Screen (Multi-select Cards)
 */
function SelectionScreen({
  colorPalette,
  typography,
  componentPatterns,
}: {
  colorPalette: any
  typography: any
  componentPatterns: any
}) {
  const selectedIndices = [1, 3] // Show some as selected

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-lg mb-1"
          style={{
            fontFamily: `'${typography.fontFamily.primary}', sans-serif`,
            fontWeight: typography.fontWeight.bold,
            color: colorPalette.text,
          }}
        >
          Choose your interests
        </h2>
        <p
          className="text-xs"
          style={{
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            color: colorPalette.textSecondary,
          }}
        >
          Select all that apply
        </p>
      </div>

      {/* Selection Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {['Design', 'Development', 'Marketing', 'Business', 'Writing', 'Photography'].map((item, idx) => {
          const isSelected = selectedIndices.includes(idx)
          return (
            <button
              key={idx}
              className="flex flex-col items-center justify-center gap-2 p-4 transition-all"
              style={{
                backgroundColor: isSelected
                  ? (colorPalette.primary + '10')
                  : colorPalette.surface,
                borderRadius: `${componentPatterns.cards.borderRadius}px`,
                border: isSelected
                  ? `2px solid ${colorPalette.primary}`
                  : componentPatterns.cards.hasBorder
                  ? `1px solid ${colorPalette.border}`
                  : 'none',
                boxShadow: isSelected
                  ? `0 0 0 4px ${colorPalette.primary}20`
                  : componentPatterns.cards.hasShadow ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isSelected
                    ? colorPalette.primary
                    : colorPalette.accent + '15'
                }}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isSelected ? '#FFFFFF' : colorPalette.accent}
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"/>
                  {isSelected && <path d="M9 12l2 2 4-4"/>}
                </svg>
              </div>

              {/* Label */}
              <span
                className="text-xs font-medium text-center"
                style={{
                  fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
                  color: isSelected ? colorPalette.primary : colorPalette.text,
                }}
              >
                {item}
              </span>
            </button>
          )
        })}
      </div>

      {/* Continue Button */}
      <button
        className="w-full py-3.5 mt-4 text-sm font-semibold transition-transform active:scale-[0.98]"
        style={{
          backgroundColor: colorPalette.primary,
          color: '#FFFFFF',
          borderRadius: `${componentPatterns.buttons.borderRadius}px`,
          boxShadow: componentPatterns.buttons.hasShadow ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
          fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        Continue (2 selected)
      </button>
    </div>
  )
}

/**
 * Core Action Screen (Form/Input focused)
 */
function ActionScreen({
  colorPalette,
  typography,
  componentPatterns,
}: {
  colorPalette: any
  typography: any
  componentPatterns: any
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colorPalette.surface }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={colorPalette.text} strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h2
          className="text-lg flex-1"
          style={{
            fontFamily: `'${typography.fontFamily.primary}', sans-serif`,
            fontWeight: typography.fontWeight.bold,
            color: colorPalette.text,
          }}
        >
          Create New
        </h2>
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-4">
        {/* Input Field 1 */}
        <div className="space-y-2">
          <label
            className="text-xs font-medium"
            style={{
              fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
              color: colorPalette.text,
            }}
          >
            Title
          </label>
          <input
            type="text"
            placeholder="Enter title"
            className="w-full px-3 py-2.5 text-sm"
            style={{
              backgroundColor: colorPalette.surface,
              borderRadius: `${componentPatterns.inputs.borderRadius}px`,
              border: componentPatterns.inputs.borderStyle === 'solid'
                ? `1px solid ${colorPalette.border}`
                : 'none',
              borderBottom: componentPatterns.inputs.borderStyle === 'underline'
                ? `2px solid ${colorPalette.primary}`
                : undefined,
              color: colorPalette.text,
              fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            }}
          />
        </div>

        {/* Input Field 2 */}
        <div className="space-y-2">
          <label
            className="text-xs font-medium"
            style={{
              fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
              color: colorPalette.text,
            }}
          >
            Description
          </label>
          <textarea
            placeholder="Add details..."
            rows={4}
            className="w-full px-3 py-2.5 text-sm resize-none"
            style={{
              backgroundColor: colorPalette.surface,
              borderRadius: `${componentPatterns.inputs.borderRadius}px`,
              border: componentPatterns.inputs.borderStyle === 'solid'
                ? `1px solid ${colorPalette.border}`
                : 'none',
              color: colorPalette.text,
              fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            }}
          />
        </div>

        {/* Status Card */}
        <div
          className="p-3 flex items-center gap-3"
          style={{
            backgroundColor: colorPalette.success ? (colorPalette.success + '15') : (colorPalette.primary + '10'),
            borderRadius: `${componentPatterns.cards.borderRadius}px`,
            border: `1px solid ${colorPalette.success || colorPalette.primary}40`,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colorPalette.success || colorPalette.primary }}
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="flex-1">
            <p
              className="text-xs font-medium"
              style={{
                fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
                color: colorPalette.text,
              }}
            >
              Ready to publish
            </p>
            <p
              className="text-[10px]"
              style={{
                fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
                color: colorPalette.textSecondary,
              }}
            >
              All fields completed
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        {componentPatterns.buttons.variants.includes('outline') && (
          <button
            className="flex-1 py-3 text-sm font-semibold border-2 transition-transform active:scale-95"
            style={{
              borderColor: colorPalette.primary,
              color: colorPalette.primary,
              backgroundColor: 'transparent',
              borderRadius: `${componentPatterns.buttons.borderRadius}px`,
              fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            }}
          >
            Save Draft
          </button>
        )}
        <button
          className="flex-1 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: colorPalette.primary,
            color: '#FFFFFF',
            borderRadius: `${componentPatterns.buttons.borderRadius}px`,
            boxShadow: componentPatterns.buttons.hasShadow ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            fontFamily: `'${typography.fontFamily.secondary}', sans-serif`,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Publish
        </button>
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
        {/* Full Mockup Preview */}
        <DesignMockupPreview direction={direction} />

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
