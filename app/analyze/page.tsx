import { Search, Upload, Sparkles, FileJson } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const steps = [
  {
    title: "Upload Screenshot",
    description: "Upload a screenshot of the mobile app you want to analyze.",
    icon: Upload,
  },
  {
    title: "AI Analysis",
    description: "Our AI examines the UI to extract design elements.",
    icon: Sparkles,
  },
  {
    title: "Get Results",
    description: "Receive detailed design specs including colors, typography, and spacing.",
    icon: FileJson,
  },
]

export default function AnalyzePage() {
  return (
    <div className="container py-12">
      {/* Page Header */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Analyze Mobile App
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Upload a screenshot to extract colors, typography, spacing, and
          component patterns from any mobile app.
        </p>
      </section>

      {/* Upload Area Placeholder */}
      <section className="mx-auto mt-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Upload Screenshot</CardTitle>
            <CardDescription>
              Drag and drop an image or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted">
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                PNG, JPG, or WEBP up to 10MB
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </CardContent>
        </Card>
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
