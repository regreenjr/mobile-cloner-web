/**
 * Analysis Results Page
 * =====================
 *
 * Dynamic route page for displaying Claude AI analysis results for a specific
 * reference app. Shows design patterns, features, UI patterns, and user flows
 * in a tabbed interface.
 *
 * Route: /analyze/[id]
 *
 * @module app/analyze/[id]/page
 */

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { AnalysisResultsWithSave } from "./AnalysisResultsWithSave"
import { referenceApps } from "@/lib/supabase/db"

// ============================================================================
// Types
// ============================================================================

/**
 * Page props with dynamic route params
 */
interface AnalyzeDetailPageProps {
  params: Promise<{
    id: string
  }>
}

// ============================================================================
// Metadata
// ============================================================================

/**
 * Generate dynamic metadata for the analysis page
 */
export async function generateMetadata({
  params,
}: AnalyzeDetailPageProps): Promise<Metadata> {
  const { id } = await params

  // Fetch the reference app to get its name for the title
  const result = await referenceApps.getById(id)

  if (!result.success) {
    return {
      title: "Analysis Not Found | Mobile Cloner",
      description: "The requested analysis could not be found.",
    }
  }

  const appName = result.data.name

  return {
    title: `${appName} Analysis | Mobile Cloner`,
    description: `View the AI analysis results for ${appName}, including design patterns, features, UI patterns, and user flows.`,
  }
}

// ============================================================================
// Page Component
// ============================================================================

/**
 * AnalyzeDetailPage - Displays analysis results for a specific reference app
 *
 * This is an async server component that:
 * 1. Fetches the reference app data by ID from Supabase
 * 2. Handles not found cases with Next.js notFound()
 * 3. Renders the AnalysisResults component with the fetched data
 *
 * @param props - Page props containing the dynamic route params
 */
export default async function AnalyzeDetailPage({
  params,
}: AnalyzeDetailPageProps) {
  const { id } = await params

  // Fetch the reference app data
  const result = await referenceApps.getById(id)

  // Handle not found case
  if (!result.success) {
    if ((result as any).error?.code === "NOT_FOUND") {
      notFound()
    }

    // For other errors, we'll render the error state in the component
    // This allows for retry functionality
    return (
      <div className="container py-12">
        <AnalysisResultsWithSave
          analysis={null}
          error={(result as any).error.userMessage}
          appName={undefined}
          appId={id}
        />
      </div>
    )
  }

  const referenceApp = result.data

  // Check if the app has been analyzed
  if (!referenceApp.analysis) {
    return (
      <div className="container py-12">
        <AnalysisResultsWithSave
          analysis={null}
          error="This app has not been analyzed yet. Please run an analysis first."
          appName={referenceApp.name}
          appId={id}
        />
      </div>
    )
  }

  // Render the analysis results
  return (
    <div className="container py-12">
      <AnalysisResultsWithSave
        analysis={referenceApp.analysis}
        appName={referenceApp.name}
        appId={id}
      />
    </div>
  )
}
