---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 3
  referenced: 3
  successfulFeatures: 3
---
# architecture

#### [Pattern] Result pattern with {success: boolean, data?: T, error?: DatabaseError} instead of throwing exceptions (2026-01-10)
- **Problem solved:** Database operations need predictable error handling across client and server components in Next.js, with different error types (connection, query, constraint violations)
- **Why this works:** Explicit error handling forces consumers to handle failures. No try-catch needed. Works consistently in both server and client contexts. Type-safe discrimination via success boolean.
- **Trade-offs:** Easier: Error handling is visible at call site, forced by TypeScript. Harder: Every call needs if (result.success) checks. More verbose than exceptions but more explicit.

### Separate client.ts and server.ts with different instantiation patterns - client uses singleton, server creates new client per request (2026-01-10)
- **Context:** Next.js has distinct client/server boundaries. Server components need fresh cookies per request for auth. Client needs stable singleton to avoid reconnection overhead.
- **Why:** Server-side must read cookies from request context (via @supabase/ssr) for SSR and API routes. Client-side can use singleton since browser maintains one session. Different instantiation prevents mixing contexts.
- **Rejected:** Single unified client was rejected because Next.js server/client have fundamentally different cookie access patterns. Using server client in browser or vice versa causes auth/session issues.
- **Trade-offs:** Easier: Proper auth context in all environments, no cookie leakage between requests. Harder: Developers must import from correct file (lib/supabase vs lib/supabase/server), two similar files to maintain.
- **Breaking if changed:** Merging these files would break server-side auth (cookies wouldn't refresh per request) and could cause client-side hydration mismatches. The separation is architectural not convenience.

### Environment variable validation happens at client instantiation with descriptive errors, not at build time (2026-01-10)
- **Context:** NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for all database operations. Missing vars cause cryptic runtime errors deep in Supabase SDK.
- **Why:** Runtime validation provides clear error messages at the point of failure. Build-time validation would require separate config validation step. First use detection catches misconfiguration immediately.
- **Rejected:** Build-time validation via next.config.js was considered but rejected because it's Next.js specific and doesn't help other environments (tests, Storybook). Silent fallbacks rejected because they hide misconfiguration.
- **Trade-offs:** Easier: Clear error messages, works in all environments, catches issues immediately. Harder: Errors happen at runtime not compile time, could theoretically deploy with missing vars (but would fail immediately on first use).
- **Breaking if changed:** Removing validation would cause cryptic Supabase SDK errors (null URL, invalid client). Environment vars would still be required but failures would be harder to debug.

#### [Pattern] Page placeholders follow identical structure: icon header, placeholder card with dashed border, 3-step 'How It Works' section (2026-01-10)
- **Problem solved:** Creating multiple placeholder pages (analyze, compare, design) before implementing actual functionality
- **Why this works:** Establishes consistent UX pattern that users can learn once and apply across all features. Sets up future implementation slots without coupling pages together.
- **Trade-offs:** Easier: User onboarding, future feature implementation (clear structure to fill in). Harder: Differentiating features visually, requires more creative icon/text choices

#### [Gotcha] Build errors in pre-existing lib/ files don't block new page creation - Next.js compiles pages successfully even when other files have errors (2026-01-10)
- **Situation:** Created new pages while lib/analysisCache.ts had TypeScript errors
- **Root cause:** Next.js App Router compiles pages incrementally. Route files are isolated from lib utilities until they import them. TypeScript checks are separate from Next.js compilation.
- **How to avoid:** Easier: Can scaffold UI pages without fixing all existing type errors first. Harder: Build 'succeeds' but CI/production will still fail on type errors. False sense of progress.

### Each page uses default export with no client/server component markers, relying on Next.js App Router defaults (2026-01-10)
- **Context:** Creating static placeholder pages that don't need interactivity yet
- **Why:** Next.js App Router defaults to Server Components, which is correct for static content. No 'use client' needed until adding interactive features. Reduces bundle size and improves initial load.
- **Rejected:** 'use client' directive from start - rejected because it increases bundle size unnecessarily and contradicts Next.js SSR-first philosophy. Named exports - rejected because Next.js requires default exports for pages.
- **Trade-offs:** Easier: Optimal performance by default, no refactoring needed if pages stay static. Harder: Must add 'use client' later when adding interactivity (file upload, form state). Easy to forget and get confusing errors.
- **Breaking if changed:** If you add useState/useEffect/event handlers without 'use client', you'll get hydration errors or build failures. Must be added at top of file before any imports when interactivity is needed.

#### [Pattern] Error categorization happens in useAppSearch hook by analyzing HTTP status codes, error codes, and message patterns rather than relying on API to provide error types (2026-01-10)
- **Problem solved:** External App Store APIs return various error formats - some with codes, some with messages, some with HTTP status only. Need consistent error handling across platforms
- **Why this works:** Centralized categorizeError function creates single source of truth for error interpretation. Different APIs (iTunes vs Play Store) return different error structures - pattern matching normalizes these into consistent SearchErrorType enum
- **Trade-offs:** Easier: Single categorizeError function handles all platforms, easy to add new error patterns. Harder: Must maintain pattern matching rules, brittleness if APIs change error message wording

### Demo page fetches full app details via separate API call when screenshots aren't in search results, rather than always including screenshots in search endpoint (2026-01-10)
- **Context:** Search results from app-store/search endpoint may not include screenshots (to keep response size small). Demo page needs screenshots to display ScreenshotGallery
- **Why:** Separation of concerns - search endpoint optimized for fast autocomplete with minimal data, details endpoint fetches complete app info including screenshots only when needed. Avoids over-fetching data for users who never select an app
- **Rejected:** Always including screenshots in search results - rejected because response size balloons (each screenshot is a URL string), slowing autocomplete. Making screenshots required in search - rejected because breaks existing search API contract used elsewhere
- **Trade-offs:** Easier: Search remains fast, bandwidth usage optimized, flexibility to fetch details only when needed. Harder: Two API calls instead of one (latency), loading states must handle both calls, error handling becomes more complex
- **Breaking if changed:** If secondary details fetch is removed, ScreenshotGallery shows empty state when search results lack screenshots. If screenshots are forced into search results, autocomplete becomes slower for all users due to response size

#### [Pattern] Error categorization includes retryable boolean and retryAfterMs timing, not just error type - enables smart retry behavior per error category (2026-01-10)
- **Problem solved:** Different errors have different retry strategies - network errors can retry immediately, rate limits need delay, some errors aren't retryable at all
- **Why this works:** SearchErrorInfo structure with retryable flag and retryAfterMs timing allows UI to make smart decisions. Network errors show immediate retry button, rate limits trigger countdown, server errors may disable retry entirely. Centralized categorizeError function sets these properties based on error analysis
- **Trade-offs:** Easier: UI components can render appropriate retry UX based on error metadata, retry timing respects API limits automatically. Harder: More complex error object structure, categorization logic must determine retryability for each error type

#### [Pattern] Analysis results stored in Supabase reference_apps.analysis column directly from API route, not delegated to client (2026-01-10)
- **Problem solved:** Need to persist Claude analysis results for reference apps after API call completes
- **Why this works:** Server-side storage in the API route ensures atomic operation - if analysis succeeds, storage happens immediately with server credentials. Avoids race conditions, reduces client complexity, and ensures storage even if client disconnects
- **Trade-offs:** Easier: Atomic operations, guaranteed persistence, simpler clients. Harder: API route now has database coupling, must handle storage errors, combines analysis and persistence concerns

### Cache status callbacks passed through API route to lib/claude.ts but results returned synchronously, not streamed (2026-01-10)
- **Context:** Analysis can take 10-30+ seconds and has cache hits/misses that could be reported to client in real-time
- **Why:** Existing lib/claude.ts analyzeAppScreenshots supports cache callbacks for progress tracking. API route passes these through for logging but returns final result synchronously because SSE/streaming would require significant refactoring of Next.js route and client consumption patterns
- **Rejected:** Could implement Server-Sent Events for real-time progress, but this requires changing route to streaming response, client to handle event stream, and complicates error handling mid-stream
- **Trade-offs:** Easier: Simple request/response model, standard JSON handling, easier error management. Harder: No real-time progress for long-running analysis, clients must poll or wait for full completion
- **Breaking if changed:** If future requirement demands real-time progress, would need to create new streaming endpoint or version this one, potentially breaking clients that expect single JSON response

#### [Pattern] Passed error state and regenerate callback as props instead of handling retry inside InsightsSection (2026-01-11)
- **Problem solved:** InsightsSection is a presentational component rendered inside ComparisonTable, which is rendered in the Compare page that owns the API call logic
- **Why this works:** Single responsibility: InsightsSection displays data and triggers actions via callbacks. The page owns API calls, state management, and error handling. This makes testing easier and keeps the component reusable
- **Trade-offs:** Easier: Component is pure presentation, testable without API mocks, reusable. Harder: Props drilling through ComparisonTable middle layer, more props to wire up

#### [Pattern] Placed InsightCategory as a separate component within the same file rather than extracting to its own file (2026-01-11)
- **Problem solved:** InsightCategory is a 40-line component used only within ComparisonTable.tsx for rendering insight lists
- **Why this works:** Component is highly coupled to InsightsSection's data structure and styling. It's not reusable elsewhere and keeping it in the same file maintains locality of behavior. Extracting would create artificial separation without benefit
- **Trade-offs:** Easier: All insight-related code in one place, easier to understand and modify together. Harder: ComparisonTable.tsx file is longer (but still manageable at ~1300 lines with clear sections)

#### [Pattern] Separated 'Generate' and 'Regenerate' buttons with different confirmation patterns - Generate is direct action, Regenerate requires explicit deletion first (2026-01-11)
- **Problem solved:** Users might accidentally regenerate and lose existing directions with votes. Need to prevent data loss while keeping initial generation easy.
- **Why this works:** First-time generation has no data to lose so should be friction-free. Regeneration destroys existing directions and votes, requiring explicit warning. This two-step pattern (delete then generate) makes consequences clear.
- **Trade-offs:** Easier: Clear separation between safe (generate) and destructive (regenerate) actions. Users understand consequences before acting. Harder: Two buttons take more UI space. More code to handle conditional rendering.

#### [Pattern] Type mapping layer between database Row types (snake_case) and component types (camelCase) with explicit field transformations (2026-01-11)
- **Problem solved:** Supabase returns ReferenceAppRow with snake_case fields. Components expect DesignDirection with camelCase. Need consistent type safety across boundaries.
- **Why this works:** Database conventions use snake_case (SQL standard). TypeScript/React conventions use camelCase. Explicit mapping at API boundary ensures type safety and makes transformations visible. Prevents accidental undefined errors from field name mismatches.
- **Trade-offs:** Easier: Clear boundary between database and application layers. Type errors caught at mapping point. Components use idiomatic camelCase. Harder: Boilerplate mapping code for each entity. Must keep mappings in sync with schema changes.

#### [Pattern] Optimistic UI updates for voting with rollback on API failure instead of waiting for server confirmation (2026-01-11)
- **Problem solved:** Vote API calls take 200-500ms. Waiting for response makes interactions feel sluggish. Users expect instant feedback on vote actions.
- **Why this works:** Update UI immediately when user clicks vote, then call API in background. If API fails, rollback UI change and show error. Makes interactions feel instant while maintaining data consistency.
- **Trade-offs:** Easier: Instant feedback makes app feel fast and responsive. Users don't wait for network roundtrips. Harder: Must track previous state for rollback. More complex error handling. Race conditions if user clicks rapidly. Must handle partial failures (UI updated but DB didn't).