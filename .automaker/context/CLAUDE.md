# CLAUDE.md - Agent Context

## Auto-Verification Protocol

After completing any feature, automatically run these checks before marking done:

1. `npm run build` — must pass with no errors
2. `npm run lint` — must pass (warnings OK)
3. Verify all acceptance criteria from the feature description
4. If any check fails, fix and re-verify
5. Only mark complete after all checks pass — do not wait for human review

---

'## Project Overview
Mobile Cloner Web is a Next.js app that analyzes competitor mobile apps using Claude AI. Users enter an app name, the system fetches screenshots from app stores, and Claude extracts design patterns, features, and user flows.

## Critical: Reusing Existing Code

The `lib/` folder contains production-ready code copied from the mobile version. **DO NOT rewrite these files from scratch:**

- `lib/claude.ts` - Claude API with retries, caching, error handling (69KB)
- `lib/appStoreApi.ts` - iTunes Search API integration
- `lib/appStoreService.ts` - App Store service layer  
- `lib/playStoreApi.ts` - Google Play Store API
- `lib/analysisCache.ts` - Analysis caching layer

**Your job:** Adapt these files for Next.js (fix imports, remove React Native specific code) rather than rewriting.

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- Zod for runtime validation
- No `any` types

### React/Next.js
- Server Components by default
- 'use client' only when needed (interactivity, hooks)
- App Router conventions
- Loading and error states for async operations

### Naming
- Components: PascalCase (`AppSearchInput.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase with descriptive names (`AnalysisResult`, `AppFeature`)

### Styling
- Tailwind CSS utilities
- shadcn/ui components (install via `npx shadcn@latest add [component]`)
- No custom CSS unless absolutely necessary
- Dark mode support via Tailwind `dark:` variants

## File Patterns

### Page Component
```tsx
// app/analyze/page.tsx
import { AnalyzeForm } from '@/components/AnalyzeForm'

export default function AnalyzePage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analyze App</h1>
      <AnalyzeForm />
    </main>
  )
}
```

### Client Component
```tsx
// components/AnalyzeForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AnalyzeForm() {
  const [appName, setAppName] = useState('')
  // ...
}
```

### API Route
```tsx
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const { screenshots } = await request.json()
  
  // Claude API call here (server-side, key is secure)
  
  return NextResponse.json({ analysis })
}
```

### Supabase Client
```tsx
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## Database Operations

Use the existing Supabase schema. Tables:
- `reference_apps` - Main app records
- `app_features` - Features per app (FK to reference_apps)
- `app_comparisons` - Comparison records
- `design_directions` - Design direction records

Always handle errors:
```tsx
const { data, error } = await supabase
  .from('reference_apps')
  .select('*')

if (error) {
  console.error('Database error:', error)
  throw new Error('Failed to fetch apps')
}
```

## API Key Security

**CRITICAL:** The Anthropic API key must NEVER be exposed to the client.

- ✅ `ANTHROPIC_API_KEY` (server-side only)
- ❌ `NEXT_PUBLIC_ANTHROPIC_API_KEY` (exposed to browser)

All Claude API calls must go through API routes (`app/api/`).

## shadcn/ui Components

Install components as needed:
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add skeleton
npx shadcn@latest add tabs
npx shadcn@latest add badge
```

## Common Patterns

### Loading State
```tsx
const [loading, setLoading] = useState(false)

async function handleAnalyze() {
  setLoading(true)
  try {
    const result = await fetch('/api/analyze', { ... })
    // handle result
  } finally {
    setLoading(false)
  }
}

return (
  <Button disabled={loading}>
    {loading ? 'Analyzing...' : 'Analyze'}
  </Button>
)
```

### Error Handling
```tsx
const [error, setError] = useState<string | null>(null)

if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
```

## Testing Checklist

Before marking complete:
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Page loads without console errors
- [ ] API routes return expected responses
- [ ] Supabase queries work
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
