---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 1
  successfulFeatures: 1
---
# ui

### Upload placeholder areas use dashed borders (border-dashed border-2) with 'Coming soon' text instead of disabled/skeleton states (2026-01-10)
- **Context:** Need to show upload functionality exists but isn't implemented yet
- **Why:** Dashed borders communicate 'incomplete/future' state while maintaining visual structure. More explicit than skeleton loaders which imply loading, not missing functionality.
- **Rejected:** Skeleton loaders - rejected because they imply content is loading, not that feature is unimplemented. Disabled solid borders - rejected because they look broken rather than intentionally incomplete.
- **Trade-offs:** Easier: Clear communication that feature is planned. Users won't try to interact. Harder: Must remember to convert dashed to solid borders when implementing real upload functionality.
- **Breaking if changed:** If dashed borders are kept when implementing real upload, users will think the feature is still incomplete. Must be explicitly removed during implementation.

#### [Pattern] Icon containers use primary/10 background with rounded-full, creating colored circles that match theme automatically (2026-01-10)
- **Problem solved:** Need consistent icon styling across all page headers that adapts to theme changes
- **Why this works:** Using CSS variable with opacity (primary/10) ensures icons adapt to theme changes without hardcoding colors. rounded-full with fixed size creates perfect circles.
- **Trade-offs:** Easier: Theme changes automatically update all icon containers. Consistent sizing across pages. Harder: Must remember specific classes (w-12 h-12, primary/10) when adding new pages.

#### [Pattern] Step indicators use Badge component with numbered format (e.g., 'Step 1') rather than custom step components or progress bars (2026-01-10)
- **Problem solved:** Showing 3-step 'How It Works' process across all placeholder pages
- **Why this works:** Leverages existing shadcn Badge component instead of custom CSS. Numbered badges are scannable and don't require understanding progress bar semantics. Works at any screen size.
- **Trade-offs:** Easier: Reuses existing component, maintains design system consistency, no custom CSS. Harder: If real multi-step flow is added later, Badge-based explanation might confuse users about where they are in actual process.

### Rate limit errors trigger automatic countdown and retry instead of requiring manual retry button click (2026-01-10)
- **Context:** App Store APIs can rate limit users. User experience degrades if they must manually retry after waiting
- **Why:** Auto-retry with countdown reduces friction - user knows exactly when retry will happen and doesn't need to babysit the interface. Custom useCountdown hook manages timer state and triggers retry callback when complete
- **Rejected:** Manual retry only - rejected because users would need to wait unknown time then remember to click retry. Showing countdown without auto-retry - rejected because it's frustrating to watch countdown then still need to click
- **Trade-offs:** Easier: Users can walk away and come back to results. Harder: More complex state management with countdown timers, potential memory leaks if component unmounts during countdown
- **Breaking if changed:** If auto-retry is removed, rate-limited users must manually retry. If countdown is removed but auto-retry stays, users don't know when retry will happen (confusing UX)

#### [Pattern] Partial failure warnings separate from error states - when one platform succeeds and another fails, show warning banner but still display results (2026-01-10)
- **Problem solved:** User searches 'Both' platforms but iOS API succeeds while Android fails (or vice versa). Should results be shown or hidden?
- **Why this works:** Better UX to show partial results with warning than hide everything. User gets value from successful platform immediately. Yellow warning banner (not red error) indicates issue without blocking workflow
- **Trade-offs:** Easier: User gets immediate value from working platform, can retry failed platform without losing results. Harder: More complex state tracking (need both errorInfo and results), UI must handle simultaneous success and failure states

#### [Gotcha] ConnectedAppSearchInput doesn't expose useAppSearch hook to parent - all search state is internal, parent only receives onResultSelect callback (2026-01-10)
- **Situation:** Demo page needs search functionality but importing useAppSearch separately would duplicate state and API calls
- **Root cause:** ConnectedAppSearchInput is a fully encapsulated component managing its own search state via useAppSearch internally. Parent components receive selected app via callback, not by accessing hook directly. This prevents state duplication and race conditions
- **How to avoid:** Easier: No state synchronization issues, single source of truth for search state, components remain loosely coupled. Harder: Parent can't access loading/error states from search (only from onResultSelect), can't pre-populate search programmatically

### Two separate error display components (ErrorStateDisplay full-width vs InlineErrorDisplay compact) instead of one with variant prop (2026-01-10)
- **Context:** Errors need to display in different contexts - full-page errors when no results vs inline errors within dropdown menu
- **Why:** Different contexts have completely different layout requirements. ErrorStateDisplay uses full Alert component with retry button and auto-retry countdown. InlineErrorDisplay is compact with centered layout for dropdown constraints. Sharing via variant prop would create massive conditional rendering complexity
- **Rejected:** Single error component with layout variants - rejected because Alert component and centered div layout are fundamentally different, sharing would require extensive conditional styling and structure. Using only ErrorStateDisplay everywhere - rejected because it's too large for dropdown context
- **Trade-offs:** Easier: Each component optimized for its context, simpler component logic without complex conditionals. Harder: Error styling and retry logic duplicated between components, must maintain consistency manually
- **Breaking if changed:** If merged into single component, existing usage must specify variant prop. If InlineErrorDisplay is removed, dropdown errors become too large and break layout

### Used sonner for toast notifications instead of building custom toast component or using shadcn/ui toast (2026-01-11)
- **Context:** Needed to add success/error feedback for save operations without blocking the UI or requiring user dismissal
- **Why:** Sonner provides auto-dismiss, promise-based loading states (toast.promise), stacking, and rich colors out of the box. It's lightweight (4kb) and specifically designed for Next.js app router with minimal configuration
- **Rejected:** shadcn/ui toast requires more setup (reducer, action types, useToast hook) and doesn't have built-in loading state transitions. Custom toast would require implementing queuing, stacking, animations, and accessibility
- **Trade-offs:** Easier: Promise-based API means single toast.promise() call handles loading→success→error states automatically. Harder: Another dependency to maintain, less customization of toast internals compared to shadcn approach
- **Breaking if changed:** If sonner is removed, would need to refactor all toast.promise() calls to manual loading/success/error state management and implement toast positioning/stacking logic

#### [Pattern] Removed lastSaveResult state and SaveResult type after adding toasts, eliminating dual feedback mechanisms (2026-01-11)
- **Problem solved:** Previously used inline state to show save success/error, but toasts provide better UX for transient feedback
- **Why this works:** Toasts are self-dismissing and non-blocking, while inline state requires explicit UI space and cleanup logic. Having both creates confusion about which feedback mechanism is authoritative
- **Trade-offs:** Easier: Less state to manage, cleaner component logic, no need for conditional rendering of feedback UI. Harder: If toasts fail to render (JS disabled, Toaster not mounted), no feedback mechanism exists

### Used toast.promise() with manual loading toast dismissal instead of toast.loading() then separate success/error calls (2026-01-11)
- **Context:** Save operation is async and needs to show loading→success or loading→error transition with proper cleanup
- **Why:** toast.promise() doesn't work well with non-Promise code paths (early validation), so used toast.loading() to get toast ID for manual dismissal. This allows early error exits (no data) without triggering promise rejection handlers
- **Rejected:** Wrapping entire save logic in Promise.resolve() to use toast.promise() - adds unnecessary Promise wrapper for synchronous validation checks
- **Trade-offs:** Easier: Can handle synchronous validation errors (no data) before API call without Promise machinery. Harder: Must manually track loadingToast ID and call toast.success/error with ID for proper replacement
- **Breaking if changed:** If toast.loading() changes to not return an ID, or if toast.success/error no longer accepts ID parameter, toasts would stack instead of replacing

#### [Pattern] Positioned Toaster at bottom-right instead of default top-center (2026-01-11)
- **Problem solved:** Analysis results page has content throughout viewport, need non-intrusive notifications
- **Why this works:** Bottom-right is conventional for non-critical notifications (success/error feedback), doesn't obscure page header or main content, follows desktop notification patterns users expect
- **Trade-offs:** Easier: Less likely to obscure important content, feels less intrusive for success messages. Harder: Users might miss notifications if focused on top of page, further from primary action buttons

### Increased component spacing and added hover states with shadow transitions rather than opacity changes (2026-01-11)
- **Context:** Analysis results components felt flat and lacked visual hierarchy indicating interactive elements
- **Why:** Shadow transitions (shadow-sm to shadow-md) provide depth perception and physical affordance (elevation) without reducing readability like opacity does. Modern design trend towards subtle 3D effects over flat design
- **Rejected:** Opacity-based hovers (opacity-80) reduce text readability. Color changes alone don't convey interactivity as strongly as elevation
- **Trade-offs:** Easier: Shadows work in both light/dark mode without theme-specific tuning, clearly indicate interactive elements. Harder: More GPU work for shadow rendering, could impact performance with hundreds of cards
- **Breaking if changed:** Removing hover states would make interface feel less responsive and make clickable elements ambiguous

#### [Pattern] Used gradient backgrounds (bg-gradient-to-br from-card to-muted/20) for summary cards instead of solid colors (2026-01-11)
- **Problem solved:** Summary cards needed to stand out from regular content cards but maintain subtle hierarchy
- **Why this works:** Subtle gradients provide visual interest and hierarchy without harsh color boundaries. Using semantic colors (card, muted) ensures theme consistency. Low opacity (20%) keeps it subtle
- **Trade-offs:** Easier: Creates natural visual hierarchy, works in light/dark themes automatically via semantic tokens. Harder: Gradients don't work in forced-colors mode (accessibility), requires fallback

#### [Gotcha] EmptyState component needs explicit min-height and background to be visually distinct from 'no content' rendering bugs (2026-01-11)
- **Situation:** Empty states can look like rendering failures or missing data errors if not clearly styled
- **Root cause:** Explicit min-height (160px) ensures empty state has presence even with short text. Background (bg-muted/30) and border clearly indicate intentional empty state vs broken UI
- **How to avoid:** Easier: Users immediately understand there's no data vs something being broken. Harder: Takes up fixed vertical space even when message is short

#### [Pattern] Changed TypographyDisplay from vertical list to responsive grid with card-like items (2026-01-11)
- **Problem solved:** Typography information (family, size, weight, line-height) was presented as plain list losing visual hierarchy
- **Why this works:** Grid layout allows scanning multiple properties at once. Card-like styling (border, background, padding) groups related info and makes each property feel like a distinct data point rather than list item
- **Trade-offs:** Easier: Better scannability, clearer property boundaries, more modern appearance. Harder: Takes more vertical space, less compact for many typography sets

### Used transition-all for interactive elements (badges, cards) instead of specific transition properties (2026-01-11)
- **Context:** Multiple properties change on hover (shadow, scale, border) and need coordinated animation
- **Why:** transition-all ensures all hover effects animate smoothly without specifying each property. Simpler to maintain as new hover effects are added
- **Rejected:** Specific transitions (transition-shadow, transition-transform) are more performant but require updating class when adding new hover effects. transition-all is negligible performance impact for small components
- **Trade-offs:** Easier: Single class handles all transitions, future-proof for new hover effects. Harder: Could animate unintended properties if class changes affect multiple CSS properties
- **Breaking if changed:** Removing transitions would make interactions feel janky and less polished

#### [Pattern] Added ring overlays (ring-1 ring-black/5) to ColorSwatch instead of borders (2026-01-11)
- **Problem solved:** Color swatches need visible boundaries but borders can clash with swatch color
- **Why this works:** Rings with low opacity (5-10%) provide subtle boundaries that work with any swatch color. Theme-aware (black in light, white in dark) and don't reduce visible color area like borders do
- **Trade-offs:** Easier: Works with any color including white/black, adapts to theme automatically. Harder: Ring requires understanding of Tailwind's ring utilities vs border utilities

### Separated insight regeneration state from main page state to avoid re-rendering the entire comparison table (2026-01-11)
- **Context:** When regenerating insights, the existing comparison results should remain visible and stable while only the insights section updates
- **Why:** Keeping `isRegeneratingInsights` separate from `pageState` prevents the entire page from re-rendering. The comparison table and results remain mounted and visible during regeneration, providing better UX and avoiding expensive re-renders
- **Rejected:** Setting `pageState` back to 'comparing' during regeneration - this would unmount the comparison results and show only a loading spinner, losing all visible context
- **Trade-offs:** Easier: Users see their comparison while insights regenerate, no layout shift. Harder: More state variables to manage (insightsError, isRegenerating vs single pageState enum)
- **Breaking if changed:** If merged into pageState, regenerating insights would unmount ComparisonTable and lose scroll position, user selections, and visual context. The UX would degrade significantly

#### [Pattern] Used skeleton placeholders with pulse animation for insight loading instead of generic spinner (2026-01-11)
- **Problem solved:** Users wait 3-10 seconds for Claude API to generate insights, need to show progress and set expectations
- **Why this works:** Skeleton screens with realistic layout shapes prime users for the content structure they'll see, reduce perceived wait time, and prevent layout shift when content appears. Generic spinners don't communicate what's being loaded
- **Trade-offs:** Easier: Users understand what's loading, less jarring transition. Harder: More complex JSX for skeleton UI, must maintain skeleton structure matching real content

### Implemented expandable insight lists with 'Show N more' instead of pagination or scrolling containers (2026-01-11)
- **Context:** Claude can return 10-20+ items per insight category (similarities, differences, recommendations), which would dominate the page
- **Why:** Inline expansion keeps users in context without navigation. Shows initial 5 items so users see content immediately, then can expand if interested. No scroll containers (which can trap user's scroll) or separate pages (which lose context)
- **Rejected:** Scroll container with max-height - creates nested scrolling which is confusing. Pagination - requires clicks and loses context between pages. Show all - overwhelms the UI
- **Trade-offs:** Easier: Scannable page, no scroll traps, users control detail level. Harder: Must track expanded state per category, calculate remaining items
- **Breaking if changed:** If changed to show all items, insights section becomes too tall and pushes comparison table off screen. Users lose overview and must scroll excessively to see their comparison results

#### [Gotcha] InsightsSectionProps was both an interface export and included in type exports, causing TypeScript conflict (2026-01-11)
- **Situation:** Initially defined 'export interface InsightsSectionProps' and also added it to the final 'export type { InsightsSectionProps }' block
- **Root cause:** TypeScript allows exporting interfaces directly with 'export interface', which already makes them available to importers. Adding them again to a type export block creates a duplicate export declaration error
- **How to avoid:** Easier: Just use 'export interface' for interfaces, saves a line in exports. Harder: Easy to forget this rule and add to export block by habit

### Used three distinct color schemes (green, blue, purple) with matching icons for insight categories instead of uniform styling (2026-01-11)
- **Context:** Three insight categories (Similarities, Differences, Recommendations) need to be visually distinct for scanning
- **Why:** Color coding creates instant visual hierarchy and helps users quickly navigate to the category they want. Green (CheckCircle2) = positive/shared traits, Blue (XCircle) = contrasting features, Purple (Lightbulb) = actionable advice. This matches common UI conventions
- **Rejected:** Uniform gray styling with just different headings - harder to scan, no visual anchors, categories blend together
- **Trade-offs:** Easier: Instant recognition of category type, better visual hierarchy, matches user mental models. Harder: Must maintain consistent color scheme, more complex CSS
- **Breaking if changed:** If changed to uniform colors, users lose visual scanning ability. The insights section becomes a wall of text requiring careful reading of headers instead of instant color recognition

### Built custom dropdown selector instead of using a third-party Select component library (2026-01-11)
- **Context:** Need app selection UI but no select component exists in the UI library. Could add shadcn/ui Select or build custom.
- **Why:** Custom implementation keeps bundle size minimal, provides exact UX needed (showing app metadata like category and screenshot count), and avoids dependency on another component library. Full control over styling and behavior.
- **Rejected:** Adding shadcn/ui Select component would add ~5-10KB and require additional dependencies. Generic select wouldn't naturally display rich content like screenshots count and category.
- **Trade-offs:** Easier: Full control over styling, behavior, and displayed content. Harder: Must handle keyboard navigation, accessibility, and click-outside logic manually. More code to maintain.
- **Breaking if changed:** If replaced with generic select component, would lose ability to show rich app metadata in dropdown. Would need custom rendering logic anyway.

### Multiple skeleton loading states instead of single global loading spinner - separate skeletons for app list, direction cards, and generation process (2026-01-11)
- **Context:** Different parts of UI load at different times (apps from DB, directions from DB, generation from API). Need to show what's loading without blocking entire page.
- **Why:** Granular loading states provide better UX by showing which specific content is loading. Users can interact with loaded sections while others load. Skeleton shapes match final content creating visual continuity.
- **Rejected:** Single page-level spinner would be simpler but blocks all interaction. Progress bar doesn't show what's loading. Could lazy load everything but then nothing shows initially.
- **Trade-offs:** Easier: Users see page structure immediately and understand what content is coming. Can interact with loaded sections. Harder: Must maintain multiple loading states. More conditional rendering logic. Skeleton components must match real content layout.
- **Breaking if changed:** If changed to global spinner, page appears blank during any loading operation. Users can't see available content or understand page structure. If skeletons don't match final layout, causes jarring layout shift.

#### [Gotcha] Export dialog must be controlled (isOpen/onClose props) rather than uncontrolled (managing own state) to prevent state persistence bugs (2026-01-11)
- **Situation:** DesignDirectionExport dialog can be opened from multiple direction cards. Each card needs independent dialog state that doesn't leak between cards.
- **Root cause:** If dialog manages own state internally (uncontrolled), closing dialog on one card can leave internal state that affects opening dialog on different card. Controlled pattern ensures parent owns state and resets properly between uses.
- **How to avoid:** Easier: Parent component controls when dialog opens/closes. No hidden state bugs. Easy to debug state flow. Harder: More boilerplate (state + handlers) in parent component. Each usage point needs own state management.