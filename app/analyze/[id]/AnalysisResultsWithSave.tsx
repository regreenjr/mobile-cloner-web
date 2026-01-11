"use client"

/**
 * AnalysisResultsWithSave
 * =======================
 *
 * Client wrapper component that adds Save to Supabase functionality
 * to the AnalysisResults component.
 *
 * This component:
 * - Handles the save operation using referenceApps.update
 * - Manages saving state (isSaving)
 * - Provides visual feedback during save operations
 * - Shows toast notifications for success/error states
 *
 * @module app/analyze/[id]/AnalysisResultsWithSave
 */

import * as React from "react"
import { toast } from "sonner"
import { AnalysisResults, type AnalysisResultsProps } from "@/components/AnalysisResults"
import { referenceApps } from "@/lib/supabase/db"

// ============================================================================
// Types
// ============================================================================

/**
 * Props for AnalysisResultsWithSave
 * Extends AnalysisResultsProps with the app ID needed for saving
 */
export interface AnalysisResultsWithSaveProps extends Omit<AnalysisResultsProps, "onSave" | "isSaving"> {
  /** The ID of the reference app to save to */
  appId: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * AnalysisResultsWithSave - Wraps AnalysisResults with save functionality
 *
 * This client component wraps the AnalysisResults component and provides
 * the save-to-Supabase functionality. It uses the referenceApps.update
 * function to persist the analysis data.
 *
 * @example
 * ```tsx
 * <AnalysisResultsWithSave
 *   analysis={analysisData}
 *   appName="Instagram"
 *   appId="123e4567-e89b-12d3-a456-426614174000"
 * />
 * ```
 */
export function AnalysisResultsWithSave({
  analysis,
  appId,
  appName,
  ...props
}: AnalysisResultsWithSaveProps) {
  const [isSaving, setIsSaving] = React.useState(false)

  /**
   * Handles saving the analysis to Supabase
   *
   * This function:
   * 1. Sets the saving state to true
   * 2. Calls referenceApps.update with the analysis data
   * 3. Shows toast notifications for success/error feedback
   */
  const handleSave = React.useCallback(async () => {
    // Don't save if there's no analysis data
    if (!analysis) {
      toast.error("No analysis data to save", {
        description: "Please run an analysis first before saving.",
      })
      return
    }

    // Don't save if already saving
    if (isSaving) {
      return
    }

    setIsSaving(true)

    // Show loading toast that will be updated on success/error
    const toastId = toast.loading("Saving analysis...", {
      description: appName ? `Saving analysis for ${appName}` : "Please wait while we save your analysis.",
    })

    try {
      // Update the reference app with the current analysis data
      const result = await referenceApps.update(appId, {
        analysis: analysis,
      })

      if (result.success) {
        toast.success("Analysis saved successfully!", {
          id: toastId,
          description: appName
            ? `The analysis for ${appName} has been saved to your database.`
            : "Your analysis has been saved to the database.",
        })
        console.log("[AnalysisResultsWithSave] Analysis saved successfully for app:", appId)
      } else {
        toast.error("Failed to save analysis", {
  id: toastId,
  description: (result as any).error?.userMessage || "An error occurred while saving. Please try again.",
})
console.error("[AnalysisResultsWithSave] Failed to save analysis:", (result as any).error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      toast.error("Failed to save analysis", {
        id: toastId,
        description: errorMessage,
      })
      console.error("[AnalysisResultsWithSave] Error saving analysis:", err)
    } finally {
      setIsSaving(false)
    }
  }, [analysis, appId, appName, isSaving])

  return (
    <AnalysisResults
      {...props}
      analysis={analysis}
      appName={appName}
      onSave={handleSave}
      isSaving={isSaving}
    />
  )
}

// ============================================================================
// Exports
// ============================================================================

export type { AnalysisResultsProps }
