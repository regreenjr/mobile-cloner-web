import Link from "next/link"
import { Search, GitCompare, Palette, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const features = [
  {
    title: "Analyze",
    description:
      "Deep dive into any mobile app's UI structure, components, and design patterns. Extract colors, typography, spacing, and more.",
    href: "/analyze",
    icon: Search,
  },
  {
    title: "Compare",
    description:
      "Compare two apps side-by-side to understand design differences, identify patterns, and learn from successful implementations.",
    href: "/compare",
    icon: GitCompare,
  },
  {
    title: "Design",
    description:
      "Generate design specifications and code from your analysis. Export styles, components, and design tokens for your projects.",
    href: "/design",
    icon: Palette,
  },
]

export default function Home() {
  return (
    <div className="container py-12 md:py-24">
      {/* Hero Section */}
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Clone Any Mobile App Design
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Analyze mobile app UIs, compare design patterns, and generate code.
          The ultimate tool for designers and developers who want to learn from
          the best apps.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/analyze">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/compare">Compare Apps</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto mt-16 max-w-5xl md:mt-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything You Need
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete toolkit for mobile app design analysis and replication.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="group p-0" asChild>
                  <Link href={feature.href}>
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto mt-16 max-w-4xl md:mt-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
          <p className="mt-4 text-muted-foreground">
            Three simple steps to clone any mobile app design.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <h3 className="mt-4 font-semibold">Upload Screenshots</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload screenshots of the app you want to analyze.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <h3 className="mt-4 font-semibold">AI Analysis</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Our AI extracts colors, typography, spacing, and components.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <h3 className="mt-4 font-semibold">Export & Build</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get design specs and code to recreate the design.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
