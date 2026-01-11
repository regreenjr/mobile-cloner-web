# Mobile Cloner Web

AI-powered mobile app cloning pipeline that analyzes competitor apps, extracts design patterns and user flows, and generates production-ready specifications.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Database:** Supabase (Postgres + Auth + Storage)
- **AI:** Claude API (Anthropic SDK)
- **Deployment:** Vercel

## Project Structure

```
mobile-cloner-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── analyze/
│   │   ├── page.tsx          # Main analyze page
│   │   └── [id]/page.tsx     # Analysis results
│   ├── design/
│   │   └── page.tsx          # Design directions
│   ├── compare/
│   │   └── page.tsx          # App comparison
│   └── api/
│       ├── analyze/route.ts  # Claude analysis endpoint
│       └── app-store/route.ts # App Store fetch endpoint
├── components/
│   ├── ui/                   # shadcn components
│   ├── AppSearchInput.tsx
│   ├── ScreenshotGallery.tsx
│   ├── AnalysisResults.tsx
│   ├── DesignDirectionCard.tsx
│   └── ComparisonTable.tsx
├── lib/
│   ├── claude.ts             # Claude API (from mobile project)
│   ├── appStoreApi.ts        # iTunes API (from mobile project)
│   ├── appStoreService.ts    # App Store service (from mobile project)
│   ├── playStoreApi.ts       # Play Store API (from mobile project)
│   ├── analysisCache.ts      # Cache layer (from mobile project)
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   └── db.ts             # Database operations
│   └── utils.ts
├── stores/
│   ├── useAnalyzeStore.ts
│   └── useDesignStore.ts
├── types/
│   └── index.ts
├── supabase/
│   └── migrations/           # Existing migrations
└── .env.local
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=           # Server-side only (no NEXT_PUBLIC_)
```

## Database Schema

Already created in Supabase:
- `reference_apps` - Stores app info and screenshots
- `app_features` - Extracted features per app
- `app_comparisons` - Comparison data
- `design_directions` - Generated design directions

Storage buckets:
- `screenshots` - App screenshots
- `design-assets` - Design exports

## Core User Flows

### Flow 1: Analyze App
1. User enters app name (e.g., "Headspace")
2. System searches iTunes/Play Store API
3. User selects correct app from results
4. System fetches all screenshots
5. User clicks "Analyze"
6. Claude analyzes screenshots (loading state)
7. Results displayed: design patterns, features, UI patterns
8. Results saved to Supabase

### Flow 2: Compare Apps
1. User selects 2-4 analyzed apps
2. System generates comparison matrix
3. Shows: shared features, unique features, design differences

### Flow 3: Generate Design Direction
1. User selects analyzed app
2. Claude generates 4 design directions
3. User votes/selects preferred direction
4. System exports design tokens (colors, typography, spacing)

## API Routes

### POST /api/app-store
Search and fetch app screenshots (server-side to avoid CORS)

### POST /api/analyze
Send screenshots to Claude for analysis (keeps API key server-side)

## Key Differences from Mobile Version

1. **API key security:** ANTHROPIC_API_KEY is server-side only
2. **No native dependencies:** Pure web, no Expo
3. **shadcn/ui:** Pre-built accessible components
4. **API routes:** Server-side processing for external APIs
5. **Simpler deployment:** Just push to Vercel

## Concurrency Strategy

Features can be built in parallel:

**Group A (parallel):** 
- Next.js scaffold + shadcn setup
- Supabase client setup

**Group B (parallel, after A):**
- App search & screenshot fetcher
- Analysis results UI

**Group C (after B):**
- Claude analysis integration

**Group D (parallel, after C):**
- Compare apps feature
- Design direction generator
