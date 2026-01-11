"use client"

import * as React from "react"
import {
  Palette,
  Wand2,
  Download,
  Code,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DesignDirectionCard,
  DesignDirectionCardSkeleton,
  DesignDirectionGrid,
} from "@/components/DesignDirectionCard"
import { DesignDirectionExport } from "@/components/DesignDirectionExport"

import { referenceApps, designDirections } from "@/lib/supabase/db"
import type { ReferenceAppRow, DesignDirectionRow } from "@/types/database"
import type { DesignDirection } from "@/types/design"
import type { AppAnalysis } from "@/types/analyze"

// ============================================================================
// Types
// ============================================================================

interface GenerationState {
  isGenerating: boolean
  progress: number
  error: string | null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps a database row to the DesignDirection type used by components
 */
function mapRowToDesignDirection(row: DesignDirectionRow): DesignDirection {
  return {
    id: row.id,
    projectId: row.project_id,
    directionNumber: row.direction_number,
    name: row.name,
    description: row.description ?? "",
    moodKeywords: row.mood_keywords,
    colorPalette: row.color_palette,
    darkModeColors: row.dark_mode_colors,
    typography: row.typography,
    componentPatterns: row.component_patterns,
    votes: row.votes,
    voters: row.voters,
    isSelected: row.is_selected,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Generates a simple UUID for voter ID (client-side)
 */
function generateVoterId(): string {
  // Check if we have a stored voter ID in localStorage
  if (typeof window !== "undefined") {
    const storedId = localStorage.getItem("voter_id")
    if (storedId) return storedId

    // Generate a new one
    const newId =
      "voter_" +
      Math.random().toString(36).substring(2, 9) +
      "_" +
      Date.now().toString(36)
    localStorage.setItem("voter_id", newId)
    return newId
  }
  return "anonymous_" + Math.random().toString(36).substring(2, 9)
}

// ============================================================================
// Steps Data for "How It Works"
// ============================================================================

const steps = [
  {
    title: "Select Design",
    description: "Choose from analyzed designs or start with a template.",
    icon: Palette,
  },
  {
    title: "AI Generation",
    description: "Our AI generates code and assets based on the design spec.",
    icon: Wand2,
  },
  {
    title: "Export & Download",
    description: "Download generated components, styles, and design tokens.",
    icon: Download,
  },
]

// ============================================================================
// App Selection Card Component
// ============================================================================

interface AppSelectionCardProps {
  apps: ReferenceAppRow[]
  selectedApp: ReferenceAppRow | null
  onSelectApp: (app: ReferenceAppRow) => void
  isLoading: boolean
}

function AppSelectionCard({
  apps,
  selectedApp,
  onSelectApp,
  isLoading,
}: AppSelectionCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const analyzedApps = apps.filter((app) => app.analysis !== null)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Select an Analyzed App</CardTitle>
          <CardDescription>
            Loading analyzed apps...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analyzedApps.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Select a Design</CardTitle>
          <CardDescription>
            Choose an analyzed design or start from a template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted">
            <Code className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No analyzed apps available yet
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Analyze an app first in the Analyze section
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Select an Analyzed App</CardTitle>
        <CardDescription>
          Choose an app to generate design directions from
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Custom dropdown selector */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-left transition-colors",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              isOpen && "border-primary ring-2 ring-primary/20"
            )}
          >
            {selectedApp ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedApp.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApp.category} • {selectedApp.screenshots.length} screenshots
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">
                Select an analyzed app...
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border bg-background shadow-lg">
              <div className="max-h-64 overflow-y-auto p-2">
                {analyzedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onSelectApp(app)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      "hover:bg-muted",
                      selectedApp?.id === app.id && "bg-primary/10"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Palette className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{app.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.category} • {app.screenshots.length} screenshots
                      </p>
                    </div>
                    {selectedApp?.id === app.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected app preview */}
        {selectedApp && selectedApp.analysis && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <h4 className="font-medium text-sm mb-2">Analysis Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Style:</span>{" "}
                <span className="font-medium">{selectedApp.analysis.overallStyle}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Screens:</span>{" "}
                <span className="font-medium">{selectedApp.analysis.screensAnalyzed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target:</span>{" "}
                <span className="font-medium">{selectedApp.analysis.targetAudience}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Patterns:</span>{" "}
                <span className="font-medium">{selectedApp.analysis.designPatterns.length}</span>
              </div>
            </div>
            {/* Color preview */}
            <div className="mt-3 flex gap-1.5">
              {Object.entries(selectedApp.analysis.colorPalette)
                .slice(0, 6)
                .map(([key, color]) => (
                  <div
                    key={key}
                    className="h-6 w-6 rounded-md border"
                    style={{ backgroundColor: color as string }}
                    title={key}
                  />
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Generation Section Component
// ============================================================================

interface GenerationSectionProps {
  selectedApp: ReferenceAppRow | null
  onGenerate: () => void
  onRegenerate: () => void
  hasExistingDirections: boolean
  generationState: GenerationState
}

function GenerationSection({
  selectedApp,
  onGenerate,
  onRegenerate,
  hasExistingDirections,
  generationState,
}: GenerationSectionProps) {
  const { isGenerating, error } = generationState

  if (!selectedApp) {
    return null
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {!hasExistingDirections ? (
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating Directions...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Design Directions
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Regenerate Directions
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating && (
        <p className="text-center text-sm text-muted-foreground">
          This may take up to 2 minutes. Please wait...
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Design Directions Display Component
// ============================================================================

interface DirectionsDisplayProps {
  directions: DesignDirection[]
  selectedId: string | null
  votedIds: string[]
  votingId: string | null
  onVote: (directionId: string) => void
  onSelect: (directionId: string) => void
  onExport: (directionId: string) => void
  isLoading: boolean
}

function DirectionsDisplay({
  directions,
  selectedId,
  votedIds,
  votingId,
  onVote,
  onSelect,
  onExport,
  isLoading,
}: DirectionsDisplayProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <DesignDirectionCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (directions.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Design Directions
        </h2>
        <p className="mt-2 text-muted-foreground">
          Vote for your favorite direction or select one to export design tokens
        </p>
      </div>

      <DesignDirectionGrid
        directions={directions}
        selectedId={selectedId}
        votedIds={votedIds}
        votingId={votingId}
        onVote={onVote}
        onSelect={onSelect}
        onExport={onExport}
      />
    </div>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function DesignPage() {
  // State
  const [apps, setApps] = React.useState<ReferenceAppRow[]>([])
  const [isLoadingApps, setIsLoadingApps] = React.useState(true)
  const [selectedApp, setSelectedApp] = React.useState<ReferenceAppRow | null>(null)

  const [directions, setDirections] = React.useState<DesignDirection[]>([])
  const [isLoadingDirections, setIsLoadingDirections] = React.useState(false)
  const [selectedDirectionId, setSelectedDirectionId] = React.useState<string | null>(null)
  const [votedDirectionIds, setVotedDirectionIds] = React.useState<string[]>([])
  const [votingDirectionId, setVotingDirectionId] = React.useState<string | null>(null)

  const [generationState, setGenerationState] = React.useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
  })

  // Export dialog state
  const [exportDirection, setExportDirection] = React.useState<DesignDirection | null>(null)
  const [isExportOpen, setIsExportOpen] = React.useState(false)

  // Voter ID
  const voterId = React.useMemo(() => generateVoterId(), [])

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Load analyzed apps on mount
  React.useEffect(() => {
    async function loadApps() {
      setIsLoadingApps(true)
      try {
        const result = await referenceApps.getAnalyzed()
        if (result.success) {
          setApps(result.data)
        } else {
          console.error("Failed to load apps:", (result as any).error)
        }
      } catch (error) {
        console.error("Error loading apps:", error)
      } finally {
        setIsLoadingApps(false)
      }
    }

    loadApps()
  }, [])

  // Load existing directions when an app is selected
  React.useEffect(() => {
    async function loadDirections() {
      if (!selectedApp) {
        setDirections([])
        setSelectedDirectionId(null)
        return
      }

      setIsLoadingDirections(true)
      try {
        // Use the app ID as the project ID for now
        const result = await designDirections.getByProjectId(selectedApp.id)
        if (result.success) {
          const mappedDirections = result.data.map(mapRowToDesignDirection)
          setDirections(mappedDirections)

          // Find selected direction
          const selected = mappedDirections.find((d) => d.isSelected)
          setSelectedDirectionId(selected?.id ?? null)

          // Find directions user has voted for
          const voted = mappedDirections
            .filter((d) =>
              d.voters.some((v) => v.oderId === voterId)
            )
            .map((d) => d.id)
          setVotedDirectionIds(voted)
        } else {
          console.error("Failed to load directions:", (result as any).error)
        }
      } catch (error) {
        console.error("Error loading directions:", error)
      } finally {
        setIsLoadingDirections(false)
      }
    }

    loadDirections()
  }, [selectedApp, voterId])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSelectApp = (app: ReferenceAppRow) => {
    setSelectedApp(app)
    setGenerationState((prev) => ({ ...prev, error: null }))
  }

  const handleGenerate = async () => {
    if (!selectedApp || !selectedApp.analysis) return

    setGenerationState({
      isGenerating: true,
      progress: 0,
      error: null,
    })

    try {
      // Call the generate API
      const response = await fetch("/api/design/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedApp.id,
          referenceAnalyses: [selectedApp.analysis],
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.userMessage || "Failed to generate design directions")
      }

      // Update directions from response
      setDirections(data.data.directions)
      setGenerationState({
        isGenerating: false,
        progress: 100,
        error: null,
      })
    } catch (error) {
      console.error("Generation error:", error)
      setGenerationState({
        isGenerating: false,
        progress: 0,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    }
  }

  const handleRegenerate = async () => {
    if (!selectedApp) return

    // Delete existing directions first
    try {
      await designDirections.deleteByProjectId(selectedApp.id)
      setDirections([])
      setSelectedDirectionId(null)
      setVotedDirectionIds([])
    } catch (error) {
      console.error("Error deleting existing directions:", error)
    }

    // Then generate new ones
    await handleGenerate()
  }

  const handleVote = async (directionId: string) => {
    // Check if already voted
    if (votedDirectionIds.includes(directionId)) {
      // Remove vote
      setVotingDirectionId(directionId)
      try {
        const response = await fetch("/api/design/vote", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            directionId,
            voterId,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // Update local state
          setVotedDirectionIds((prev) => prev.filter((id) => id !== directionId))
          setDirections((prev) =>
            prev.map((d) =>
              d.id === directionId
                ? { ...d, votes: data.data.totalVotes }
                : d
            )
          )
        }
      } catch (error) {
        console.error("Error removing vote:", error)
      } finally {
        setVotingDirectionId(null)
      }
    } else {
      // Cast vote
      setVotingDirectionId(directionId)
      try {
        const response = await fetch("/api/design/vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            directionId,
            voterId,
            voterName: "Anonymous User",
          }),
        })

        const data = await response.json()

        if (data.success) {
          // Update local state
          setVotedDirectionIds((prev) => [...prev, directionId])
          setDirections((prev) =>
            prev.map((d) =>
              d.id === directionId
                ? { ...d, votes: data.data.totalVotes }
                : d
            )
          )
        }
      } catch (error) {
        console.error("Error casting vote:", error)
      } finally {
        setVotingDirectionId(null)
      }
    }
  }

  const handleSelect = async (directionId: string) => {
    if (!selectedApp) return

    try {
      const result = await designDirections.select(directionId, selectedApp.id)
      if (result.success) {
        setSelectedDirectionId(directionId)
        setDirections((prev) =>
          prev.map((d) => ({
            ...d,
            isSelected: d.id === directionId,
          }))
        )
      }
    } catch (error) {
      console.error("Error selecting direction:", error)
    }
  }

  const handleExport = (directionId: string) => {
    const direction = directions.find((d) => d.id === directionId)
    if (direction) {
      setExportDirection(direction)
      setIsExportOpen(true)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="container py-12">
      {/* Page Header */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Palette className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Design Generator
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Generate AI-powered design directions from analyzed mobile apps.
          Vote on directions and export design tokens for your projects.
        </p>
      </section>

      {/* App Selection */}
      <section className="mx-auto mt-12 max-w-2xl">
        <AppSelectionCard
          apps={apps}
          selectedApp={selectedApp}
          onSelectApp={handleSelectApp}
          isLoading={isLoadingApps}
        />
      </section>

      {/* Generation Controls */}
      {selectedApp && (
        <section className="mx-auto mt-8 max-w-2xl">
          <GenerationSection
            selectedApp={selectedApp}
            onGenerate={handleGenerate}
            onRegenerate={handleRegenerate}
            hasExistingDirections={directions.length > 0}
            generationState={generationState}
          />
        </section>
      )}

      {/* Design Directions Display */}
      {selectedApp && (directions.length > 0 || isLoadingDirections || generationState.isGenerating) && (
        <section className="mx-auto mt-12 max-w-6xl">
          <DirectionsDisplay
            directions={directions}
            selectedId={selectedDirectionId}
            votedIds={votedDirectionIds}
            votingId={votingDirectionId}
            onVote={handleVote}
            onSelect={handleSelect}
            onExport={handleExport}
            isLoading={isLoadingDirections || generationState.isGenerating}
          />
        </section>
      )}

      {/* How It Works (shown when no directions yet) */}
      {!selectedApp && (
        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            How Design Generation Works
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
      )}

      {/* Export Dialog */}
      <DesignDirectionExport
        direction={exportDirection}
        isOpen={isExportOpen}
        onClose={() => {
          setIsExportOpen(false)
          setExportDirection(null)
        }}
      />
    </div>
  )
}
