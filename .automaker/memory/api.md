---
tags: [api]
summary: api implementation decisions and patterns
relevantTo: [api]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# api

### API endpoint accepts both base64 and URLs for screenshots, converting URLs to base64 internally before calling Claude (2026-01-10)
- **Context:** Claude's vision API requires base64-encoded images, but screenshots exist as URLs in the database and may be provided either way by clients
- **Why:** The existing lib/claude.ts analyzeAppScreenshots function already handles URL-to-base64 conversion with error handling, retries, and caching. Reusing this logic in the API route avoids duplication and maintains consistent image processing behavior
- **Rejected:** Could require clients to always send base64, but this puts conversion burden on clients and increases payload size. Could always require URLs and fetch server-side, but this doesn't support inline base64 submissions
- **Trade-offs:** Easier: Flexible client usage, single conversion point with error handling. Harder: Must validate and handle two input formats, larger request bodies when base64 is sent
- **Breaking if changed:** If the API route is changed to only accept URLs, any clients sending base64 screenshots will break. If lib/claude.ts fetchImageAsBase64 function changes signature or behavior, this endpoint breaks

#### [Gotcha] Screenshot batching limit of 10 enforced at API route level by truncating array, not rejecting request (2026-01-10)
- **Situation:** Claude API and rate limiting constraints require limiting screenshots per request, but clients may send more
- **Root cause:** Truncating allows partial success rather than complete failure. The batching info in response tells clients how many were processed vs total, enabling them to make follow-up requests for remaining screenshots
- **How to avoid:** Easier: Graceful degradation, clients can implement progressive enhancement. Harder: Clients must check batchingInfo and handle multi-request flows, potential confusion if clients don't notice truncation

#### [Pattern] GET endpoint on /api/analyze returns rate limit status and max screenshots config without requiring authentication or request body (2026-01-10)
- **Problem solved:** Clients need to know rate limits and screenshot limits before making expensive analysis POST requests
- **Why this works:** Separate GET endpoint allows clients to check configuration cheaply without submitting data. No auth required since rate limit info is not sensitive and applies globally per API key
- **Trade-offs:** Easier: Clients can preflight check limits, better UX with informed decisions. Harder: Two endpoints to maintain, potential for config drift if limits change

#### [Pattern] Error handling splits insights errors from main comparison errors to allow partial success (2026-01-11)
- **Problem solved:** The /api/compare endpoint returns both comparison data and AI insights. Insights can fail (rate limits, API timeout) while comparison succeeds
- **Why this works:** Comparison data is the core feature; insights are value-add. If insights fail, users should still see their comparison and have a retry button for insights. Treating both as a single failure point would block access to working comparison results
- **Trade-offs:** Easier: Users get comparison results even with insight failures, can retry just insights without re-comparing. Harder: More complex state management, must handle partial success scenarios

#### [Gotcha] Vote persistence requires client-side voter ID in localStorage, not server sessions (2026-01-11)
- **Situation:** Need to track which directions a user voted for across page reloads without requiring authentication. Users should see their vote state persist.
- **Root cause:** Anonymous voting system with no auth means can't use user IDs. localStorage provides persistent client-side storage. Generate unique voter ID on first vote and reuse for all subsequent votes.
- **How to avoid:** Easier: Simple implementation, no server session management, works without auth. Harder: Users can manipulate votes by clearing localStorage or using multiple browsers. No vote verification.

### DELETE existing directions before regenerating rather than UPDATE in place, despite requiring extra API call (2026-01-11)
- **Context:** Regeneration creates new directions with different content. Could update existing rows or delete and recreate. Votes are tied to direction IDs.
- **Why:** Deleting makes clear that old directions (and their votes) are gone - fresh start. Updating in place would preserve IDs but votes would become meaningless for different content. Delete + create is explicit about data loss.
- **Rejected:** Could UPDATE existing direction rows with new content, preserving IDs and votes. Rejected because votes on old content shouldn't transfer to different generated content - misleading and breaks vote integrity.
- **Trade-offs:** Easier: Clear semantic meaning - regenerate = start fresh. Vote counts reset appropriately for new content. Simpler logic than UPDATE. Harder: Requires two API calls (DELETE then POST). Brief moment where no directions exist. Must handle partial failures (deleted but generation fails).
- **Breaking if changed:** If changed to UPDATE, votes remain on completely different content - vote counts become meaningless. If partial failure handling removed, regeneration can leave user with no directions and no way to recover without page reload.