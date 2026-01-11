"use client"

import * as React from "react"
import {
  Download,
  Copy,
  Check,
  FileCode2,
  FileJson2,
  Paintbrush,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { DesignDirection } from "@/types/design"
import {
  exportDesignTokens,
  downloadDesignTokens,
  copyDesignTokensToClipboard,
  type ExportFormat,
} from "@/lib/design-tokens"

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the DesignDirectionExport dialog component
 */
export interface DesignDirectionExportProps {
  /** The design direction to export */
  direction: DesignDirection | null
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** Additional class names for the dialog content */
  className?: string
}

/**
 * Format configuration for export tabs
 */
interface FormatConfig {
  id: ExportFormat
  label: string
  icon: React.ReactNode
  description: string
  fileExtension: string
  language: string
}

// ============================================================================
// Constants
// ============================================================================

const EXPORT_FORMATS: FormatConfig[] = [
  {
    id: "tailwind",
    label: "Tailwind CSS",
    icon: <Paintbrush className="h-4 w-4" />,
    description: "Tailwind CSS configuration file with theme extensions",
    fileExtension: ".js",
    language: "javascript",
  },
  {
    id: "css",
    label: "CSS Variables",
    icon: <FileCode2 className="h-4 w-4" />,
    description: "CSS custom properties for :root with dark mode support",
    fileExtension: ".css",
    language: "css",
  },
  {
    id: "json",
    label: "Design Tokens",
    icon: <FileJson2 className="h-4 w-4" />,
    description: "DTCG-compliant JSON format for design systems",
    fileExtension: ".json",
    language: "json",
  },
]

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * CodePreview - Displays the export content with syntax highlighting styling
 */
function CodePreview({
  content,
  language,
  className,
}: {
  content: string
  language: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-muted/30 overflow-hidden",
        className
      )}
    >
      <div className="absolute top-2 right-2">
        <Badge variant="outline" className="text-xs font-mono">
          {language}
        </Badge>
      </div>
      <pre className="p-4 overflow-auto max-h-[300px] text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
    </div>
  )
}

/**
 * CopyButton - Button to copy content to clipboard with feedback
 */
function CopyButton({
  onClick,
  disabled,
  isCopied,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  isCopied: boolean
  className?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn("gap-1.5", className)}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy to clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * DownloadButton - Button to download the exported content as a file
 */
function DownloadButton({
  onClick,
  disabled,
  filename,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  filename: string
  className?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn("gap-1.5", className)}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download as {filename}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * FormatTabContent - Content for each export format tab
 */
function FormatTabContent({
  direction,
  format,
  onCopy,
  onDownload,
  isCopied,
  copiedFormat,
}: {
  direction: DesignDirection
  format: FormatConfig
  onCopy: (format: ExportFormat) => void
  onDownload: (format: ExportFormat) => void
  isCopied: boolean
  copiedFormat: ExportFormat | null
}) {
  const result = exportDesignTokens(direction, format.id)
  const showCopiedState = isCopied && copiedFormat === format.id

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{format.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton
            onClick={() => onCopy(format.id)}
            isCopied={showCopiedState}
          />
          <DownloadButton
            onClick={() => onDownload(format.id)}
            filename={result.filename}
          />
        </div>
      </div>

      <CodePreview content={result.content} language={format.language} />

      <p className="text-xs text-muted-foreground">
        Filename: <code className="font-mono bg-muted px-1 py-0.5 rounded">{result.filename}</code>
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DesignDirectionExport - A dialog component for exporting design directions
 *
 * Features:
 * - Tabbed interface for different export formats (Tailwind, CSS, JSON)
 * - Live preview of the exported content
 * - Copy to clipboard functionality with visual feedback
 * - Download as file functionality
 * - Responsive design for mobile and desktop
 *
 * @example
 * ```tsx
 * const [isExportOpen, setIsExportOpen] = useState(false);
 * const [selectedDirection, setSelectedDirection] = useState<DesignDirection | null>(null);
 *
 * <DesignDirectionExport
 *   direction={selectedDirection}
 *   isOpen={isExportOpen}
 *   onClose={() => setIsExportOpen(false)}
 * />
 * ```
 */
export function DesignDirectionExport({
  direction,
  isOpen,
  onClose,
  className,
}: DesignDirectionExportProps) {
  const [activeTab, setActiveTab] = React.useState<ExportFormat>("tailwind")
  const [copiedFormat, setCopiedFormat] = React.useState<ExportFormat | null>(null)
  const [isCopied, setIsCopied] = React.useState(false)

  // Reset copied state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setCopiedFormat(null)
      setIsCopied(false)
    }
  }, [isOpen])

  /**
   * Handle copying to clipboard
   */
  const handleCopy = React.useCallback(
    async (format: ExportFormat) => {
      if (!direction) return

      try {
        await copyDesignTokensToClipboard(direction, format)
        setCopiedFormat(format)
        setIsCopied(true)

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setIsCopied(false)
          setCopiedFormat(null)
        }, 2000)
      } catch (error) {
        console.error("Failed to copy to clipboard:", error)
        // Could add toast notification here for error feedback
      }
    },
    [direction]
  )

  /**
   * Handle downloading the file
   */
  const handleDownload = React.useCallback(
    (format: ExportFormat) => {
      if (!direction) return

      try {
        downloadDesignTokens(direction, format)
      } catch (error) {
        console.error("Failed to download file:", error)
        // Could add toast notification here for error feedback
      }
    },
    [direction]
  )

  // Don't render if no direction is provided
  if (!direction) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn("sm:max-w-2xl max-h-[90vh] overflow-y-auto", className)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Design Tokens
          </DialogTitle>
          <DialogDescription>
            Export &quot;{direction.name}&quot; as design tokens in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ExportFormat)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3">
            {EXPORT_FORMATS.map((format) => (
              <TabsTrigger
                key={format.id}
                value={format.id}
                className="gap-1.5"
              >
                {format.icon}
                <span className="hidden sm:inline">{format.label}</span>
                <span className="sm:hidden">{format.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {EXPORT_FORMATS.map((format) => (
            <TabsContent key={format.id} value={format.id} className="mt-4">
              <FormatTabContent
                direction={direction}
                format={format}
                onCopy={handleCopy}
                onDownload={handleDownload}
                isCopied={isCopied}
                copiedFormat={copiedFormat}
              />
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1.5" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Export Dialog Trigger Component
// ============================================================================

/**
 * Props for the DesignDirectionExportTrigger component
 */
export interface DesignDirectionExportTriggerProps {
  /** The design direction to export when triggered */
  direction: DesignDirection
  /** Custom trigger content */
  children?: React.ReactNode
  /** Additional class names */
  className?: string
}

/**
 * DesignDirectionExportTrigger - A self-contained export button with dialog
 *
 * This component provides an easy way to add export functionality
 * anywhere in the UI without managing dialog state externally.
 *
 * @example
 * ```tsx
 * <DesignDirectionExportTrigger direction={myDirection}>
 *   <Button variant="outline">Export Design</Button>
 * </DesignDirectionExportTrigger>
 * ```
 */
export function DesignDirectionExportTrigger({
  direction,
  children,
  className,
}: DesignDirectionExportTriggerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <div
        className={className}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsOpen(true)
          }
        }}
      >
        {children || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      <DesignDirectionExport
        direction={direction}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

// ============================================================================
// Exports
// ============================================================================

export { CodePreview, CopyButton, DownloadButton }
